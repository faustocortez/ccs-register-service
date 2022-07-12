import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addSeconds, subSeconds, formatISO, parseISO, format } from 'date-fns';
import { IMissingRegister, IRegister, IRegisterService, RegisterEvents, Defaults } from '../interfaces/register.interface';
import { ILogger, LogLevel } from '../interfaces/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';
import { formatDate } from '../utils/helpers/dates.helpers';

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
    
    public async insertMissingRegisters(table: string, date: string): Promise<IMissingRegister[]> {
        this.logger.log(LogLevel.INFO, `* STARTING PROCESS TO ADD MISSING REGISTERS *`);
        try {
            // "Pairs" are those registers that have either "Conectado" or "Desconectado" value in "evento" property.
            this.logger.log(LogLevel.DEBUG, `Process input: table => "${table}" & date (fecha) => "${date}"\n`);
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

                    // Group pairs in arrays by agent id
                    if (agente != '0') {
                        if (currentAgentId === agente) {
                            registersByAgent.push(register);
                            if (index === (registers.length - 1)) mappedGroupPairs[agente] = [...registersByAgent];
                        } else {
                            this.logger.log(LogLevel.DEBUG, `TOTAL REGISTERS OF "agente" ${currentAgentId} = [${registersByAgent.length}]`);
                            mappedGroupPairs[currentAgentId] = [...registersByAgent];
                            currentAgentId = agente;
                            this.logger.log(LogLevel.DEBUG, `CURRENT VALUE OF "agente" ${currentAgentId}\n`);
                            registersByAgent = [register]; // first register of updated currentId
                            if (index === (registers.length -1)) mappedGroupPairs[currentAgentId] = [...registersByAgent];
                        }
                    }
                }

                // Searching pair log is missing
                this.logger.log(LogLevel.INFO, `* FIND MISSING PAIRS OF "Conectado" AND "Desconectado" REGISTERS *`);
                let events = {  0: Defaults.Connected, 1: Defaults.Disconnected };
                for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
                    this.logger.log(LogLevel.DEBUG, `ITERATING REGISTERS OF "agente" ${agente}`);
                    // Initializing aux variables
                    let register: IRegister = pairs[0];
                    let { evento } = register;
                    let counter = 0;
                    for (let index = 0; index < pairs.length; index++) {
                        const event = events[counter];
                        register = pairs[index];
                        evento = register.evento;

                        // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
                        switch (counter) {
                            case 0:
                                this.logger.log(LogLevel.DEBUG, `CASE 0: Evaluating if exist "${events[0]}"`);
                                // Checking if "Conectado" exists
                                if (event === evento) {
                                    counter++;
                                    // If "Conectado" exists but is the last one, add missing "Desconectado"
                                    if ((pairs.length - 1) === index) {
                                        this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${events[1]}" OF "agente" ${agente} *`);
                                        this.logger.log(LogLevel.DEBUG, `PREPARING AND  COMPUTING DATA FOR THE LAST MISSING REGISTER "${events[1]}"`);
                                        const date = `${format(register.fecha as Date, Defaults.DateFormat)} ${register.inicia}`;
                                        let startTime: string = format(addSeconds(parseISO(date), 1), Defaults.TimeFormat);

                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente, register.servicio);
                                        if (result.length > 1) {
                                            const referenceLog = result[result.length - 1];
                                            let datetime = `${format(referenceLog.fecha as Date, Defaults.DateFormat)} ${referenceLog.inicia}`;

                                            if (referenceLog.idEvento === RegisterEvents.Loguear) {
                                                startTime = format(subSeconds(parseISO(datetime), 1), Defaults.TimeFormat);
                                            } else if (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado){
                                                startTime = format(addSeconds(parseISO(datetime), 1), Defaults.TimeFormat);
                                            }
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                        continue;
                                    }
                                } else {
                                    // "Conectado" does not exists
                                    // Preparing data to insert missing "Conectado"
                                    counter = 0;
                                    this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${event}" OF "agente" ${agente} *`);
                                    this.logger.log(LogLevel.DEBUG, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    let defaultTime = `${format(register.fecha as Date, Defaults.DateFormat)} ${register.inicia}`;
                                    let startTime: string = format(subSeconds(parseISO(defaultTime), 1), Defaults.TimeFormat);
                                    let result: IRegister[] | [];
                                    // if missing "Conectado" is the first one.
                                    if (index === 0) {
                                        result = await this.getRegistersBeforeStartTime(register.inicia, agente, register.servicio);
                
                                        if (result.length) {
                                            const firstRegister = result[0];
                                            let time = `${format(firstRegister.fecha as Date, Defaults.DateFormat)} ${firstRegister.inicia}`;
                                            if (firstRegister.idEvento === RegisterEvents.Loguear) {
                                                startTime = format(addSeconds(parseISO(time), 1), Defaults.TimeFormat);
                                            } else if (firstRegister.idEvento === RegisterEvents.Codificado || firstRegister.idEvento === RegisterEvents.Estado){
                                                startTime = format(subSeconds(parseISO(time), 1), Defaults.TimeFormat);
                                            }
                                        }
                                    } else if (index > 0) {
                                        let lastDesconectado = pairs[index - 1];
                                        result = await this.getRegistersBetweenStartTimes(lastDesconectado.inicia, register.inicia, agente, register.servicio);
                                        // in case result is empty
                                        if (result.length) {
                                            const referenceLog = result[result.length-1];
                                            let datetime = `${format(referenceLog.fecha as Date, Defaults.DateFormat)} ${referenceLog.inicia}`;

                                            startTime = format(subSeconds(parseISO(datetime), 1), Defaults.TimeFormat);
                                        }
                                    }
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        const date = parseISO(`${RegisterService.dateToISOString(register.fecha as Date, 'date') } ${register.inicia}`);
                                        const startTime: string = format(addSeconds(date, 1), Defaults.TimeFormat);
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    await this.insertMissingRegister(register, event, startTime);
                                    continue;
                                }
                                break;
                            case 1: // "Desconectado"
                                this.logger.log(LogLevel.DEBUG, `CASE 1: Evaluating if exist "${events[1]}"`);
                                counter = evento === events[0] ? counter : 0;
                                if (evento !== event) {
                                    // Preparing data to insert missing "Desconectado"
                                    this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${event}" OF "agente" ${agente} *`);
                                    this.logger.log(LogLevel.DEBUG, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    let lastConectado = pairs[index - 1];
                                    const result = await this.getRegistersBetweenStartTimes(lastConectado.inicia, register.inicia, agente, register.servicio);
                                    // in case result is empty
                                    let defaultTime = `${format(lastConectado.fecha as Date, Defaults.DateFormat)} ${lastConectado.inicia}`;
                                    let startTime: string = format(addSeconds(parseISO(defaultTime), 1), Defaults.TimeFormat);

                                    if (result.length) {
                                        const referenceLog = result[result.length - 1];
                                        let datetime = `${format(referenceLog.fecha as Date, Defaults.DateFormat)} ${referenceLog.inicia}`;

                                        if (referenceLog.idEvento === RegisterEvents.Loguear) {
                                            const aux = result[result.length - 2];
                                            let time = `${format(aux.fecha as Date, Defaults.DateFormat)} ${aux.inicia}`;
                                            startTime = format(addSeconds(parseISO(time), 1), Defaults.TimeFormat);
                                        } else if (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado){
                                            startTime = format(addSeconds(parseISO(datetime), 1), Defaults.TimeFormat);
                                        }
                                    }
                                    await this.insertMissingRegister(register, event, startTime);
                                    // Agregar ultimo desconectado cuando conectado cae en desconectado.
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente, register.servicio);
                                        let date = parseISO(`${RegisterService.dateToISOString(register.fecha as Date, 'date') } ${register.inicia}`);
                                        startTime = format(addSeconds(date, 1), Defaults.TimeFormat); // when is the last register of all

                                        if (result.length) {
                                            const last = result[result.length - 1];
                                            date = parseISO(`${RegisterService.dateToISOString(last.fecha as Date, 'date') } ${last.inicia}`);
                                            if (last.idEvento === RegisterEvents.Codificado || last.idEvento === RegisterEvents.Estado) startTime = format(addSeconds(date, 1), Defaults.TimeFormat);
                                            else startTime = format(subSeconds(date, 1), Defaults.TimeFormat);
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    continue;
                                }
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
        const { idRegistro, ...data } = reference;
        const missingRegister = {
            ...data,
            evento: missingPair,
            idEvento: missingPair === Defaults.Connected ? 4 : 300,
            inicia: startTime,
            fecha: format(data.fecha as Date, Defaults.DateFormat),
            fechaIng: format(data.fecha as Date, Defaults.DateFormat),
            fechaFinal: Defaults.DateValue,
            termina: Defaults.TimeValue,
            dura: Defaults.TimeValue,
        };
        this.logger.log(LogLevel.INFO, `* INSERTING PREPARED MISSING REGISTER "${missingPair}" *`, missingRegister);
        const values = Object.values(missingRegister).map(v => `"${v}"`);
        this.query = `INSERT INTO ${this.table} (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
        this.logger.log(LogLevel.DEBUG, `Query => "${this.query}"`);
        const result = await this.database.query(this.query) as unknown as ResultSetHeader;
        this.logger.log(LogLevel.DEBUG, `Query result:`, result[0]);
        
        let inserted: boolean = false;
        if (result[0].affectedRows > 0) {
            inserted = true;
            this.logger.log(LogLevel.INFO, `* REGISTER INSERTED SUCCESSFULLY: "insertedId": ${result[0].insertId} OF "agente" ${data.agente} *\n`);
        }
        else this.logger.log(LogLevel.ERROR, `Can't insert missing register ${missingPair} of "agente" ${data.agente}`, { ...missingRegister });

        this.missingRegisters.push({
            agentId: data.agente,
            inserted,
            missingRegister: {
                id: result[0]?.insertId || 0,
                event: missingPair,
                startTime,
                date: missingRegister.fecha,
                service: data.servicio
            },
            existingRegister: {
                id: idRegistro,
                event: data.evento,
                date: formatDate(data.fecha as Date, Defaults.DateFormat),
                startTime: data.inicia,
                service: data.servicio
            }
        });
    }

    private async getAllEventPairsOrderedByAgent(): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.INFO, `* GETTING ALL PAIRS OF REGISTERS "Conectado AND "Desconectado" FROM "fecha" "${this.date}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND idEvento IN (${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY agente ASC, inicia ASC;`
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        
        return response;
    }

    private async getRegistersBetweenStartTimes(startTime: string, endTime: string, agentId: string, service: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS BETWEEN "${startTime}" & "${endTime}" OF "agente" ${agentId} & "servicio" "${service}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE (inicia BETWEEN "${startTime}" AND "${endTime}") AND fecha="${this.date}" AND servicio="${service}" AND agente=${agentId} AND idEvento NOT IN (${RegisterEvents.Loguear}, ${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY inicia ASC LIMIT 1;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private async getRegistersAfterStartTime(startTime: string, agentId: string, service: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS AFTER "inicia" "${startTime}" OF "agente"  ${agentId} & "servicio" "${service}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND inicia > "${startTime}" AND agente=${agentId} AND servicio="${service}" AND idEvento NOT IN (${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY inicia ASC;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => ${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    private async getRegistersBeforeStartTime(startTime: string, agentId: string, service: string): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS BEFORE "inicia" "${startTime}" OF "agente"  ${agentId} & "servicio" "${service}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND inicia < "${startTime}" AND agente=${agentId} AND servicio="${service}" AND idEvento NOT IN (${RegisterEvents.Loguear}, ${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY inicia ASC LIMIT 1;`;
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