import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { addSecondsToTime, formatDate, parseISOString, subSecondsToTime } from '../utils/helpers/dates.helpers';
import { IMissingRegister, IRegister, IRegisterService, RegisterEvents, Defaults } from '../interfaces/register.interface';
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
    
    /**
     * @param  {string} - Table where the missing registers will be requested
     * @param  {string} - Date (fecha) to filter register
     * @returns {IMissingRegister[]} - Array of missing registers inserted and not
     */
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
                                // Checking if "Conectado" exists
                                if (event === evento) {
                                    counter++;
                                    this.logger.log(LogLevel.DEBUG, `[CASE 0]: ✓ "${events[0]}" exists`);
                                    // If "Conectado" exists but is the last one, add missing "Desconectado"
                                    if ((pairs.length - 1) === index) {
                                        this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${events[1]}" OF "agente" ${agente} *`);
                                        this.logger.log(LogLevel.INFO, `* PREPARING AND  COMPUTING DATA FOR THE LAST MISSING REGISTER "${events[1]}" *`);
                                        let startTime: string = RegisterService.calculateStartTime(register.fecha as Date, register.inicia, Defaults.ADD);

                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente, register.servicio);
                                        if (result.length > 1) {
                                            const referenceLog: IRegister = result[result.length - 1];
                                            const operation: Defaults.ADD | Defaults.SUB = (referenceLog.idEvento === RegisterEvents.Loguear) ? Defaults.SUB: Defaults.ADD;
                                            startTime = RegisterService.calculateStartTime(referenceLog.fecha as Date, referenceLog.inicia, operation);
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                        continue;
                                    }
                                } else {
                                    // "Conectado" does not exists
                                    counter = 0;
                                    this.logger.log(LogLevel.DEBUG, `[CASE 0]: ✕ "${events[0]}" doesn't exists`);
                                    this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${event}" OF "agente" ${agente} *`);
                                    this.logger.log(LogLevel.INFO, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    let startTime: string = RegisterService.calculateStartTime(register.fecha as Date, register.inicia, Defaults.SUB);
                                    let result: IRegister[] | [];
                                    let referenceLog: IRegister;
                                    // if missing "Conectado" is the first one.
                                    if (index === 0) {
                                        this.logger.log(LogLevel.DEBUG, `-- Missing "Conectado" its the first one of "agente" ${agente} --`);
                                        result = await this.getRegistersBeforeStartTime(register.inicia, agente, register.servicio);
                
                                        if (result.length) {
                                            referenceLog = result[0];
                                            const operation: Defaults.ADD | Defaults.SUB = (referenceLog.idEvento === RegisterEvents.Loguear) ? Defaults.ADD: Defaults.SUB;
                                            startTime = RegisterService.calculateStartTime(referenceLog.fecha as Date, referenceLog.inicia, operation);
                                        }
                                    } else if (index > 0) {
                                        this.logger.log(LogLevel.DEBUG, `-- Missing "${events[0]}" its between registers of "agente" ${agente} --`);
                                        let lastDesconectado = pairs[index - 1];
                                        result = await this.getRegistersBetweenStartTimes(lastDesconectado.inicia, register.inicia, agente, register.servicio);
                                        if (result.length) {
                                            referenceLog = result[result.length-1];
                                            startTime = RegisterService.calculateStartTime(referenceLog.fecha as Date, referenceLog.inicia, Defaults.SUB);
                                        }
                                    }
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        this.logger.log(LogLevel.DEBUG, `-- Missing ${events[1]} of "agente" ${agente} --`);
                                        startTime = RegisterService.calculateStartTime(register.fecha as Date, register.inicia, Defaults.ADD);
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    await this.insertMissingRegister(register, event, startTime);
                                    continue;
                                }
                                break;
                            case 1: // "Desconectado"
                                counter = evento === events[0] ? counter : 0;
                                if (evento !== event) {
                                    this.logger.log(LogLevel.DEBUG, `[CASE 0]: ✕ "${events[1]}" exists`);

                                    // Preparing data to insert missing "Desconectado"
                                    this.logger.log(LogLevel.INFO, `* MISSING REGISTER "${event}" OF "agente" ${agente} *`);
                                    this.logger.log(LogLevel.DEBUG, `* PREPARING AND COMPUTING DATA FOR THE MISSING REGISTER "${event}"...`);
                                    
                                    const lastConectado = pairs[index - 1];
                                    const result = await this.getRegistersBetweenStartTimes(lastConectado.inicia, register.inicia, agente, register.servicio, 'DESC');
                                    let referenceLog: IRegister;
                                    // default startTime in case result is empty
                                    let startTime: string = RegisterService.calculateStartTime(lastConectado.fecha as Date, lastConectado.inicia, Defaults.ADD);
                                    if (result.length) {
                                        referenceLog = (result[result.length - 1].idEvento === RegisterEvents.Loguear)
                                                        ? result[result.length - 2]
                                                        : result[result.length - 1];
                                        startTime = RegisterService.calculateStartTime(referenceLog.fecha as Date, referenceLog.inicia, Defaults.ADD);
                                    }
                                    await this.insertMissingRegister(register, event, startTime);
                                    // Adding last "Desconectado" when the last register is "Conectado" and should be "Desconectado"
                                    if ((pairs.length - 1) === index && register.idEvento === RegisterEvents.Conectado) {
                                        this.logger.log(LogLevel.DEBUG, `-- Missing ${events[1]} its the last one of "agente" ${agente} --`);
                                        const result = await this.getRegistersAfterStartTime(register.inicia, agente, register.servicio);
                                        startTime = RegisterService.calculateStartTime(register.fecha as Date, register.inicia, Defaults.ADD); // when is the last register of all

                                        if (result.length) {
                                            referenceLog = result[result.length - 1];
                                            const operation: Defaults.ADD | Defaults.SUB = (referenceLog.idEvento === RegisterEvents.Codificado || referenceLog.idEvento === RegisterEvents.Estado)
                                                                        ? Defaults.ADD
                                                                        : Defaults.SUB;
                                            startTime = RegisterService.calculateStartTime(referenceLog.fecha as Date, referenceLog.inicia, operation);
                                        }
                                        await this.insertMissingRegister(register, events[1], startTime);
                                    };
                                    continue;
                                }
                                this.logger.log(LogLevel.DEBUG, `[CASE 1]: ✓ "${events[1]}" exists`);
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
    
    /**
     * Add missing register (Conectado or Desconectado) to Database
     * @param  {IRegister} - Reference (existing pair)
     * @param  {string} - Missing pair
     * @param  {string} - Computed startTime for the missing register to insert
     */
    private async insertMissingRegister(reference: IRegister, missingPair: string, startTime: string): Promise<void> {
        const { idRegistro, ...data } = reference;
        const missingRegister = {
            ...data,
            evento: missingPair,
            idEvento: missingPair === Defaults.Connected ? 4 : 300,
            inicia: startTime,
            fecha: formatDate(data.fecha as Date, Defaults.DateFormat),
            fechaIng: formatDate(data.fecha as Date, Defaults.DateFormat),
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

    /**
     * Get all pairs of register to find the missing one tru these existing pairs
     * @returns {IRegister[]} Array of register
     */
    private async getAllEventPairsOrderedByAgent(): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.INFO, `* GETTING ALL PAIRS OF REGISTERS "Conectado AND "Desconectado" FROM "fecha" "${this.date}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE fecha="${this.date}" AND idEvento IN (${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY agente ASC, inicia ASC;`
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        
        return response;
    }

    /**
     * Get register BETWEEN startTime from the existing pair register to calculate the starTime of the missing pair register (Conectado or Desconectado)
     * @param  {string} - Value of "inicia" in reference register (last Conectado or Desconectado)
     * @param  {string} - Value of "inicia" in the current register of the iteration
     * @param  {string} - Value of "agente" in the current register of the iteration
     * @param  {string} - Value of "servicio" in the current register of the iteration ("MUEVETE", "MUEVETE-PREDICTIVA")
     * @param  {string='ASC'} sort
     * @returns {IRegister[]} Array of registers
     */
    private async getRegistersBetweenStartTimes(startTime: string, endTime: string, agentId: string, service: string, sort: string = 'ASC'): Promise<IRegister[] | []> {
        this.logger.log(LogLevel.INFO, `* GETTING REGISTERS BETWEEN "${startTime}" & "${endTime}" OF "agente" ${agentId} & "servicio" "${service}" *`);
        this.query = `SELECT * FROM ${this.table} WHERE (inicia BETWEEN "${startTime}" AND "${endTime}") AND fecha="${this.date}" AND servicio="${service}" AND agente=${agentId} AND idEvento NOT IN (${RegisterEvents.Loguear}, ${RegisterEvents.Conectado}, ${RegisterEvents.Desconectado}) ORDER BY inicia ${sort} LIMIT 1;`;
        this.logger.log(LogLevel.DEBUG, `Query to execute => "${this.query}"`);
        const result = await this.database.query(this.query);
        const response = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query result: total registers found => [${response.length}]\n`);
        if (response.length) return response as IRegister[];
        return [];
    }

    /**
     * Get register AFTER startTime from the existing pair register to calculate the starTime of the missing pair register (Conectado or Desconectado)
     * @param  {string} - Value of "inicia" in the current register of the iteration
     * @param  {string} - Value of "agente" in the current register of the iteration
     * @param  {string} - Value of "servicio" in the current register of the iteration ("MUEVETE", "MUEVETE-PREDICTIVA")
     * @returns {IRegister[]} Array of registers
     */
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

    /**
     * Get register BEFORE startTime from the existing pair register to calculate the starTime of the missing pair register (Conectado or Desconectado)
     * @param  {string} - Value of "inicia" in the current register of the iteration
     * @param  {string} - Value of "agente" in the current register of the iteration
     * @param  {string} - Value of "servicio" in the current register of the iteration ("MUEVETE", "MUEVETE-PREDICTIVA")
     * @returns {IRegister[]} Array of registers
     */
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

    /**
     * Get first valid id (different of 0) of existing registers
     * @param  {IRegister[]} - Existing registers
     * @returns {string}
     */
    private static getFirstValidAgentId(registers: IRegister[]): string {
        for (let index = 0; index < registers.length; index++) {
            const { agente } = registers[index];
            if (agente == '0') continue;
            return agente;
        }
    }

    /**
     * Calculate value of startTime (inicia) for the missing register (Conectado/Desconectado)
     * @param  {Date} - Date (fecha) value of ISO string (yyyy-MM-dd)
     * @param  {string} - Time (inicia) value of ISO string (HH:mm:ss)
     * @param  {Defaults.ADD|Defaults.SUB=Defaults.ADD} - Mathematical operation to compute the time on the Date
     * @param  {number=1} - Seconds to ADD or SUBTRACT
     * @return {string} - Value of "inicia" to create missing register
     */
    private static calculateStartTime(date: Date, time: string, operation: Defaults.ADD | Defaults.SUB, seconds: number = 1): string {
        const dateFormatted: string = `${formatDate(date, Defaults.DateFormat)} ${time}`;
        const computedDate = (operation === Defaults.ADD)
                            ? addSecondsToTime(parseISOString(dateFormatted), seconds)
                            : subSecondsToTime(parseISOString(dateFormatted), seconds);
        const startTime: string = formatDate(computedDate, Defaults.DateFormat);
        return startTime;
    }
}

export default RegisterService;