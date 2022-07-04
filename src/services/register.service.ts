import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IRegister, IRegisterService } from '../interfaces/services/register.interface';
import { ILogger, LogLevel } from '../interfaces/services/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';
import { RowDataPacket } from 'mysql2';

const getPairLogEvent = `SELECT * FROM register WHERE agente = ? AND fecha = ? AND idEvento IN (?) ORDER BY inicia ASC;`;
@injectable()
class RegisterService implements IRegisterService {

    public constructor(
        @inject(TYPES.Database) private readonly database: Database,
        @inject(TYPES.Logger) private logger: ILogger
    ) {}

    public async getRegisters(): Promise<RowDataPacket[]> {
        const result = await this.database.query('SELECT * FROM calls.register');
        const registers = result[0] as RowDataPacket[];
        return registers;
    }

    public async getRegistersByFilter(queryStringParameters?: string): Promise<RowDataPacket[]> {
        const { filters } = JSON.parse(queryStringParameters);
        this.logger.log(LogLevel.DEBUG, 'filters', filters);
        
        const preparedValues = Object.values(filters[0]);
        this.logger.log(LogLevel.DEBUG, 'prepared', preparedValues);
        
        const result = await this.database.query(getPairLogEvent, preparedValues);
        const registers = result[0] as RowDataPacket[];
        
        return registers;
    }

    public async getRegistersByParams(params: { [key: string]: unknown; }): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.DEBUG, 'params', params);
        const preparedValues = Object.values(params);
        this.logger.log(LogLevel.DEBUG, 'prepared', preparedValues);
        const result = await this.database.query(getPairLogEvent, preparedValues);
        const registers = result[0] as RowDataPacket[];
        
        return registers;
    }
    
    public async getPairsOrderByAgent(): Promise<RowDataPacket[]> {
        // Pairs are those registers that have either "Conectado"
        // or "Desconectado" value in "evento" property.
        this.logger.log(LogLevel.DEBUG, 'Getting pairs in MySQL DB');
        const result = await this.database.query("SELECT * FROM register WHERE idEvento IN (4,300) ORDER BY agente;");
        const registers = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query pairs result [${registers.length}]:`, registers);
        
        return registers;
    }

    public async getAgentsId(): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.DEBUG, 'Getting agents id in MySQL DB');
        const result = await this.database.query("SELECT distinct(agente) FROM register ORDER BY agente;");
        const registers = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query agents result [${registers.length}]:`, registers, false);
        
        return registers;
    }

    public async getDbQuery(query: string, preparedValues?: (string | number)[]): Promise<RowDataPacket[]> {
        this.logger.log(LogLevel.DEBUG, `Getting query: ${ query }`);
        const result = await this.database.query(query, preparedValues);
        const registers = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query agents result [${registers.length}]:`, registers, false);
        
        return registers;
    }
}

export default RegisterService;