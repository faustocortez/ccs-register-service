import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addSeconds, format, subSeconds, isBefore } from 'date-fns';
import { IMissingRegister, IRegister, IRegisterService } from '../interfaces/register.interface';
import { ILogger, LogLevel } from '../interfaces/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';

@injectable()
class RegisterService implements IRegisterService {

    private query: string;

    private table: string;

    private date: string;

    private missingRegisters: IMissingRegister[] = [];

    public constructor(
        @inject(TYPES.Database) private readonly database: Database,
        @inject(TYPES.Logger) private logger: ILogger
    ) {}
    
    public async insertMissingRegisters(table: string, date: string): Promise<IMissingRegister[] | []> {
        this.logger.log(LogLevel.DEBUG, `${this.constructor.name} => insertMissingRegisters()`);
        try {
            // "Pairs" are those registers that have either "Conectado" or "Desconectado" value in "evento" property.
            this.table = table;
            this.date = date;
            this.logger.log(LogLevel.INFO, `Getting registers from ${this.table} in database...`);
            const registers = await this.getAllEventPairsOrderedByAgent() as IRegister[];
            let mappedGroupPairs: { [key: string]: IRegister[] } = {};
            let registersByAgent: IRegister[] = [];
            let currentAgentId: string = RegisterService.getFirstValidAgentId(registers);

            if (registers.length) {
                for (let index = 0; index < registers.length; index++) {
                    const register: IRegister = registers[index];
                    const { agente } = register;

                    if (agente != '0') {
                        // Group pairs in arrays by agent id
                        this.logger.log(LogLevel.INFO, `Grouping pairs registers by agent id ${currentAgentId} | Grouped: [${registersByAgent.length}]`);
                        if (currentAgentId === agente) {
                            registersByAgent.push(register);
                            if (index === (registers.length - 1)) {
                                this.logger.log(LogLevel.DEBUG, `Adding last array of registers: [${registersByAgent.length}]`);
                                mappedGroupPairs[agente] = [...registersByAgent];
                            }
                        } else {
                            this.logger.log(LogLevel.DEBUG, `Total registers for agent ${currentAgentId} = [${registersByAgent.length}]`);
                            mappedGroupPairs[currentAgentId] = [...registersByAgent];
                            currentAgentId = agente;
                            this.logger.log(LogLevel.INFO, `Updated currentAgentId: ${currentAgentId}`);
                            registersByAgent = [register]; // first register of updated currentId
                            if (index === (registers.length -1)) mappedGroupPairs[currentAgentId] = [...registersByAgent];
                        }
                    } else {
                        this.logger.log(LogLevel.ERROR, `Invalid agent id: ${agente}`);
                    }
                }
                this.logger.log(LogLevel.INFO, `Grouped pairs logs => `, mappedGroupPairs);

                // Searching pair log is missing
                this.logger.log(LogLevel.INFO, `Searching missing registers...`);
                let events = {  0: 'Conectado', 1: 'Desconectado' };
                for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
                    this.logger.log(LogLevel.INFO, `Current "agente" value: ${agente}`);
                    // Initializing aux variables
                    let register: IRegister = pairs[0];
                    let { evento } = register;
                    let counter = 0;
                    for (let index = 0; index < pairs.length; index++) {
                        const event = events[counter];
                        register = pairs[index];
                        evento = register.evento;

                        // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
                        this.logger.log(LogLevel.DEBUG, `Validating event: "${event}" | Input: ${evento}`);
                        switch (counter) {
                            case 0: // "Conectado"
                                if (event === evento) {
                                    counter++;
                                    // If current register.evento is "Conectado" and is the last one, add missing "Desconectado"
                                    if ((pairs.length - 1) === index) {
                                        this.logger.log(LogLevel.DEBUG, `Event "${evento}" found but its the last register, it means that "${events[1]}" is missing`);
                                        this.logger.log(LogLevel.DEBUG, `Creating "${events[1]}"...`);
                                        
                                        const date = `${register.fecha} ${register.inicia}`;
                                        const startTime: string = this.computeDateSeconds(date, 1);
                                        await this.insertMissingRegister(register, events[1], startTime);
                                        continue;
                                    }
                                    this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                                } else {
                                    // Preparing data to insert missing "Desconectado"
                                    counter = 0;
                                    this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                                    this.logger.log(LogLevel.DEBUG, `Missing pair: "${event}"`);
                                    this.logger.log(LogLevel.DEBUG, `Creating "${event}"...`);
                                    let date = `${register.fecha} ${register.inicia}`;
                                    let startTime: string = this.computeDateSeconds(date, 1, 'SUB');
                                    if (pairs.length > 1 && index !== 0) {
                                        let { inicia } = pairs[index-1];
                                        const result = await this.getRegistersBetweenStartTimes(inicia, register.inicia, agente);
                                        startTime = result[0].inicia;
                                        if (result[0].evento === 'loguear') {
                                            // TODO: Avaces al sumarle 1 seg no queda justo despues de "loguear", usar mismo time???
                                            date = `${result[0].fecha} ${result[0].inicia}`;
                                            startTime = this.computeDateSeconds(date, 1);
                                        } else {
                                            // insertart "loguear" y "Conectado"
                                            this.logger.log(LogLevel.ERROR, `Event "loguear" is missing...`);
                                        }
                                    }
                                        
                                    await this.insertMissingRegister(register, event, startTime);
                                }
                                break;
                            case 1: // "Desconectado"
                                counter = evento === events[0] ? counter : 0;
                                if (evento !== event) {
                                    // Preparing data to insert missing "Conectado"
                                    this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                                    this.logger.log(LogLevel.DEBUG, `Missing pair: "${event}" index ${index}`);
                                    this.logger.log(LogLevel.DEBUG, `Creating "${event}"...`);

                                    const result = await this.getRegistersFromStartTime(register.inicia, agente);
                                    let startTime: string;
                                    if (result.length > 1) {
                                        const referenceLog = result[result.length - 1];
                                        let date = `${referenceLog.fecha} ${referenceLog.inicia}`;
                                        const dateToCompare = `${register.fecha} ${register.inicia}`;
                                        date = isBefore(new Date(date), new Date(dateToCompare)) ? dateToCompare : date;
                                        console.log('final date: ', date);
                                        startTime = this.computeDateSeconds(date, 1, ((referenceLog.idEvento == 3 && 'ADD') || 'SUB'));
                                        await this.insertMissingRegister(register, event, startTime);
                                    }
                                    continue;
                                }
                                this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                                break;
                        }
                    }
                }
            }
            return this.missingRegisters;
        } catch (error) {
            this.logger.log(LogLevel.ERROR, error.message, error);
            throw new Error(error.message);
        }
    }
    
    private async insertMissingRegister(reference: IRegister, missingPair: string, startTime: string): Promise<void> {
        this.logger.log(LogLevel.DEBUG, `${this.constructor.name} => insertMissingRegister()`);
        const { idRegistro, ...data } = reference;
        const missingRegister = {
            ...data,
            evento: missingPair,
            idEvento: missingPair === 'Conectado' ? 4 : 300,
            inicia: startTime
        };
        const values = Object.values(missingRegister).map(v => `"${v}"`);
        this.query = `INSERT INTO datos (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
        this.logger.log(LogLevel.DEBUG, `$query: ${this.query}\n`);
        const result = await this.database.query(this.query) as unknown as ResultSetHeader;
        this.logger.log(LogLevel.DEBUG, `Query insertMissingRegister result:`, result);

        if (result.affectedRows > 0) {
            this.logger.log(LogLevel.INFO, `Register inserted successfully. Id: ${result.insertId}`);
            this.missingRegisters.push({
                id: `${result.insertId}`,
                agentId: data.agente,
                event: missingPair,
                startTime
            })
        } else this.logger.log(LogLevel.ERROR, `Can't insert missing register ${missingPair}`, { ...missingRegister });
    }

    private async getAllEventPairsOrderedByAgent(): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.DEBUG, `${this.constructor.name} => getAllEventPairsOrderedByAgent()`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND idEvento IN (4,300) ORDER BY agente ASC, inicia ASC;`
        this.logger.log(LogLevel.DEBUG, `Getting all event pairs ("Conectado and "Desconectado") ordered by "agente"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query getAllEventPairsOrderedByAgent result [${response.length}]`);
        
        return response;
    }

    private async getRegistersBetweenStartTimes(startTime: string, endTime: string, agentId: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.DEBUG, `${this.constructor.name} => getRegistersBetweenStartTimes()`);
        this.query = `SELECT * FROM ${this.table} WHERE (inicia BETWEEN "${startTime}" AND "${endTime}") AND fecha="${this.date}" AND agente="${agentId}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Getting events registers from "agente" ${agentId} distinct than "Conectado" and "Desconectado" between "${startTime}" & "${endTime}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query getRegistersBetweenStartTimes result [${response.length}]`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private async getRegistersFromStartTime(startTime: string, agentId: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.DEBUG, `${this.constructor.name} => getRegistersFromStartTime()`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND inicia < "${startTime}" AND agente="${agentId}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Getting events registers from "agente" ${agentId} distinct than "Conectado" and "Desconectado" where "inicia" < "${startTime}"`,);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query getRegistersFromStartTime result [${response.length}]`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private computeDateSeconds(date: string | Date, seconds: number, operation?: 'ADD' | 'SUB'): string {
        this.logger.log(LogLevel.DEBUG, `Computing date: "${date}", ${operation ? operation : 'ADD'} ${seconds}`);
        let computeDate: Date;
        if (operation === 'SUB') computeDate = subSeconds(new Date(date), seconds);
        else computeDate = addSeconds(new Date(date), seconds);

        const result = format(computeDate, 'HH:mm:ss');
        this.logger.log(LogLevel.DEBUG, `Result: "${result}"`);

        return result;
    }

    private static getFirstValidAgentId(registers: IRegister[]): string {
        for (let index = 0; index < registers.length; index++) {
            const { agente } = registers[index];
            if (agente == '0') continue;
            return agente;
        }
    }
}

export default RegisterService;