import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IRegister, IRegisterService } from '../interfaces/services/register.interface';
import { ILogger, LogLevel } from '../interfaces/services/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';
import { RowDataPacket } from 'mysql2';

const getPairLogEvent = `SELECT * FROM register WHERE agente = ? AND fecha = ? AND idEvento IN (?);`;
@injectable()
class RegisterService implements IRegisterService {

    public constructor(
        @inject(TYPES.Database) private readonly database: Database,
        @inject(TYPES.Logger) private logger: ILogger
    ) {}

    // public async getRegisters(params?: { [key: string]: unknown; }): Promise<RowDataPacket[]> {
    public async getRegisters(params: { [key: string]: unknown; }): Promise<RowDataPacket[]> {
        throw new Error('Method not implemented.');   
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
}

export default RegisterService;