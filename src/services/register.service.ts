import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addSeconds, subSeconds, formatISO, parseISO, format } from 'date-fns';
import { IMissingRegister, IRegister, IRegisterService, RegisterEvents } from '../interfaces/register.interface';
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
        this.logger.log(LogLevel.INFO, `* STARTING PROCESS TO ADD MISSING REGISTERS *`);
        try {
            // "Pairs" are those registers that have either "Conectado" or "Desconectado" value in "evento" property.
            this.logger.log(LogLevel.DEBUG, `Input for the process: table => "${table}" & date => "${date}"\n`);
            this.table = table;
            this.date = date;
            const registers = await this.getAllEventPairsOrderedByAgent() as IRegister[];
            let mappedGroupPairs: { [key: string]: IRegister[] } = {};
            let registersByAgent: IRegister[] = [];
            let currentAgentId: string = RegisterService.getFirstValidAgentId(registers);
            
            this.logger.log(LogLevel.INFO, `* MAP EXISTING PAIRS REGISTERS BY "agente" *`);
            // this.logger.log(LogLevel.INFO, `* CURRENT VALUE OF "agente" ${currentAgentId} *`);
            if (registers.length) {
                for (let index = 0; index < registers.length; index++) {
                    const register: IRegister = registers[index];
                    const { agente } = register;

                    if (agente != '0') {
                        // Group pairs in arrays by agent id
                        this.logger.log(LogLevel.DEBUG, `Adding pairs ("Conectado" | "Desconectado") registers to array of "agente" ${currentAgentId} | Current array's length: [${registersByAgent.length}]`);
                        if (currentAgentId === agente) {
                            registersByAgent.push(register);
                            if (index === (registers.length - 1)) {
                                this.logger.log(LogLevel.DEBUG, `Adding last array of registers: [${registersByAgent.length}]\n`);
                                mappedGroupPairs[agente] = [...registersByAgent];
                            }
                        } else {
                            this.logger.log(LogLevel.INFO, `* TOTAL REGISTERS OF "agente" ${currentAgentId} = [${registersByAgent.length}] *\n`);
                            mappedGroupPairs[currentAgentId] = [...registersByAgent];
                            currentAgentId = agente;
                            this.logger.log(LogLevel.INFO, `* CURRENT VALUE OF "agente" ${currentAgentId} *`);
                            registersByAgent = [register]; // first register of updated currentId
                            if (index === (registers.length -1)) mappedGroupPairs[currentAgentId] = [...registersByAgent];
                        }
                    }
                }
                // this.logger.log(LogLevel.INFO, `Grouped pairs logs => `, mappedGroupPairs);

                // Searching pair log is missing
                this.logger.log(LogLevel.INFO, `* FIND MISSING PAIRS OF "Conectado" AND "Desconectado" REGISTERS *`);
                let events = {  0: 'Conectado', 1: 'Desconectado' };
                for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
                    this.logger.log(LogLevel.INFO, `* ITERATING REGISTERS OF "agente" ${agente} *`);
                    // Initializing aux variables
                    let register: IRegister = pairs[0];
                    let { evento } = register;
                    let counter = 0;
                    for (let index = 0; index < pairs.length; index++) {
                        const event = events[counter];
                        register = pairs[index];
                        evento = register.evento;

                        // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
                        this.logger.log(LogLevel.DEBUG, `Validating "registro.evento" => "${event}"`);
                        this.logger.log(LogLevel.DEBUG, `Existing "register.evento" => "${evento}" | "idRegistro" of register => ${register.idRegistro}`);
                        switch (counter) {
                            case 0:
                                // Checking if "Conectado" exists
                                if (event === evento) {
                                    counter++;
                                    // If "Conectado" exists but is the last one, add missing "Desconectado"
                                    if ((pairs.length - 1) === index) {
                                        this.logger.log(LogLevel.DEBUG, `The "registro.evento" "${evento}" is CORRECT, but its the last register, so it means that "${events[1]}" is missing\n`);
                                        this.logger.log(LogLevel.INFO, `* PREPARING AND  COMPUTING DATA FOR THE LAST MISSING REGISTER "${events[1]}" *`);
                                        const date = `${format(register.fecha as Date, 'yyyy-MM-dd')} ${register.inicia}`;
                                        let startTime: string = format(addSeconds(parseISO(date), 1), 'HH:mm:ss');

                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente);
                                        if (result.length > 1) {
                                            const referenceLog = result[result.length - 1];
                                            let datetime = `${format(referenceLog.fecha as Date, 'yyyy-MM-dd')} ${referenceLog.inicia}`;

                                            if (referenceLog.idEvento === RegisterEvents.Loguear) {
                                                startTime = format(subSeconds(parseISO(datetime), 1), 'HH:mm:ss');
                                            } else if (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado){
                                                startTime = format(addSeconds(parseISO(datetime), 1), 'HH:mm:ss');
                                            }
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                        continue;
                                    }
                                    this.logger.log(LogLevel.DEBUG, `This "registro.evento" is CORRECT! Checking next one...\n`);
                                } else {
                                    // "Conectado" does not exists
                                    // Preparing data to insert missing "Conectado"
                                    counter = 0;
                                    this.logger.log(LogLevel.DEBUG, `"${event}" does not exist for pair => "${evento}"`, { existingPair: { 
                                        idRegistro: register.idRegistro,
                                        startTime: register.inicia,
                                        event: evento
                                    }});
                                    this.logger.log(LogLevel.INFO, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    let defaultTime = `${format(register.fecha as Date, 'yyyy-MM-dd')} ${register.inicia}`;
                                    let startTime: string = format(subSeconds(parseISO(defaultTime), 1), 'HH:mm:ss');
                                    let result: IRegister[] | [];
                                    // if missing "Conectado" is the first one.
                                    if (index === 0) {
                                        result = await this.getRegistersBeforeStartTime(register.inicia, agente);
                
                                        if (result.length) {
                                            const firstRegister = result[0];
                                            let time = `${format(firstRegister.fecha as Date, 'yyyy-MM-dd')} ${firstRegister.inicia}`;
                                            if (firstRegister.idEvento === RegisterEvents.Loguear) {
                                                startTime = format(addSeconds(parseISO(time), 1), 'HH:mm:ss');
                                            } else if (firstRegister.idEvento === RegisterEvents.Codificado || firstRegister.idEvento === RegisterEvents.Estado){
                                                startTime = format(subSeconds(parseISO(time), 1), 'HH:mm:ss');
                                            }
                                        }
                                    } else if (index > 0) {
                                        let lastDesconectado = pairs[index - 1];
                                        result = await this.getRegistersBetweenStartTimes(lastDesconectado.inicia, register.inicia, agente);
                                        // in case result is empty
                                        if (result.length > 1) {
                                            const referenceLog = result[0];
                                            let datetime = `${format(referenceLog.fecha as Date, 'yyyy-MM-dd')} ${referenceLog.inicia}`;

                                            if (referenceLog.idEvento === RegisterEvents.Loguear) {
                                                let time = `${format(referenceLog.fecha as Date, 'yyyy-MM-dd')} ${referenceLog.inicia}`;
                                                startTime = format(addSeconds(parseISO(time), 1), 'HH:mm:ss');
                                            } else if (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado){
                                                startTime = format(subSeconds(parseISO(datetime), 1), 'HH:mm:ss');
                                            }
                                        }
                                    }
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        const date = parseISO(`${RegisterService.dateToISOString(register.fecha as Date, 'date') } ${register.inicia}`);
                                        const startTime: string = format(addSeconds(date, 1), 'HH:mm:ss');
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    await this.insertMissingRegister(register, event, startTime);
                                    continue;
                                }
                                break;
                            case 1: // "Desconectado"
                                counter = evento === events[0] ? counter : 0;
                                if (evento !== event) {
                                    // Preparing data to insert missing "Desconectado"
                                    this.logger.log(LogLevel.DEBUG, `"${event}" does not exist for pair => "${evento}"`, { existingPair: { 
                                        idRegistro: register.idRegistro,
                                        startTime: register.inicia,
                                        event: evento
                                    }});
                                    this.logger.log(LogLevel.INFO, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    let lastConectado = pairs[index - 1];
                                    const result = await this.getRegistersBetweenStartTimes(lastConectado.inicia, register.inicia, agente);
                                    // in case result is empty
                                    let defaultTime = `${format(lastConectado.fecha as Date, 'yyyy-MM-dd')} ${lastConectado.inicia}`;
                                    let startTime: string = format(subSeconds(parseISO(defaultTime), 1), 'HH:mm:ss');

                                    if (result.length > 1) {
                                        const referenceLog = result[result.length - 1];
                                        let datetime = `${format(referenceLog.fecha as Date, 'yyyy-MM-dd')} ${referenceLog.inicia}`;

                                        if (referenceLog.idEvento === RegisterEvents.Loguear) {
                                            const aux = result[result.length - 2];
                                            let time = `${format(aux.fecha as Date, 'yyyy-MM-dd')} ${aux.inicia}`;
                                            startTime = format(addSeconds(parseISO(time), 1), 'HH:mm:ss');
                                        } else if (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado){
                                            startTime = format(addSeconds(parseISO(datetime), 1), 'HH:mm:ss');
                                        }
                                    }
                                    await this.insertMissingRegister(register, event, startTime);
                                    // Agregar ultimo desconectado cuando conectado cae en desconectado.
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente);
                                        let date = parseISO(`${RegisterService.dateToISOString(register.fecha as Date, 'date') } ${register.inicia}`);
                                        startTime = format(addSeconds(date, 1), 'HH:mm:ss'); // when is the last register of all

                                        if (result.length) {
                                            const last = result[result.length - 1];
                                            date = parseISO(`${RegisterService.dateToISOString(last.fecha as Date, 'date') } ${last.inicia}`);
                                            if (last.idEvento === RegisterEvents.Codificado || last.idEvento === RegisterEvents.Estado) startTime = format(addSeconds(date, 1), 'HH:mm:ss');
                                            else startTime = format(subSeconds(date, 1), 'HH:mm:ss');
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    continue;
                                }
                                this.logger.log(LogLevel.DEBUG, `This "registro.evento" is CORRECT! Checking next one...\n`);
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
        this.logger.log(LogLevel.INFO, `* INSERTING PREPARED MISSING REGISTER "${missingPair}" *`);
        const { idRegistro, ...data } = reference;
        const missingRegister = {
            ...data,
            evento: missingPair,
            idEvento: missingPair === 'Conectado' ? 4 : 300,
            inicia: startTime,
            fecha: format(data.fecha as Date, 'yyyy-MM-dd'),
            fechaIng: format(data.fecha as Date, 'yyyy-MM-dd'),
            fechaFinal: "0000-00-00"
        };
        const values = Object.values(missingRegister).map(v => `"${v}"`);
        this.query = `INSERT INTO ${this.table} (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
        this.logger.log(LogLevel.DEBUG, `Query => ${this.query}`);
        this.logger.log(LogLevel.DEBUG, `Register "${missingPair}" to insert =>`, missingRegister);
        const result = await this.database.query(this.query) as unknown as ResultSetHeader;
        this.logger.log(LogLevel.DEBUG, `Query result:`, result[0]);

        if (result[0].affectedRows > 0) {
            this.logger.log(LogLevel.INFO, `Register inserted successfully. Id: ${result[0].insertId}\n`);
            this.missingRegisters.push({
                id: `${result[0].insertId}`,
                agentId: data.agente,
                event: missingPair,
                startTime,
                date: missingRegister.fecha,
                reference: {
                    id: idRegistro,
                    event: data.evento,
                    date: data.fecha,
                    startTime: data.inicia
                }
            })
        } else this.logger.log(LogLevel.ERROR, `Can't insert missing register ${missingPair}`, { ...missingRegister });
    }

    private async getAllEventPairsOrderedByAgent(): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.INFO, `* GETTING ALL PAIRS OF REGISTERS "Conectado AND "Desconectado" ORDERED BY "agente" AND "inicia" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND idEvento IN (4,300) ORDER BY agente ASC, inicia ASC;`
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        
        return response;
    }

    private async getRegistersBetweenStartTimes(startTime: string, endTime: string, agentId: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS FROM "agente" ${agentId} DISTINCT THAN "Conectado" AND "Desconectado" BETWEEN "${startTime}" & "${endTime}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE (inicia BETWEEN "${startTime}" AND "${endTime}") AND fecha="${this.date}" AND agente="${agentId}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private async getRegistersAfterStartTime(startTime: string, agentId: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS FROM "agente" ${agentId} DISTINCT THAN "Conectado" AND "Desconectado" AND "inicia" < "${startTime}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND inicia > "${startTime}" AND agente="${agentId}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => ${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private async getRegistersBeforeStartTime(startTime: string, agentId: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS FROM "agente" ${agentId} DISTINCT THAN "Conectado" AND "Desconectado" AND "inicia" < "${startTime}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND inicia < "${startTime}" AND agente="${agentId}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => ${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private static getFirstValidAgentId(registers: IRegister[]): string {
        for (let index = 0; index < registers.length; index++) {
            const { agente } = registers[index];
            if (agente == '0') continue;
            return agente;
        }
    }

    /**
     * for more information https://date-fns.org/v2.28.0/docs/formatISO
     */
    private static dateToISOString(date: Date, representation: 'date' | 'time'): string {
        return formatISO(date, { representation });
    }
}

export default RegisterService;