import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IRegister, IRegisterService } from '../interfaces/services/register.interface';
import { ILogger, LogLevel } from '../interfaces/services/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';
import { RowDataPacket } from 'mysql2';


@injectable()
class RegisterService implements IRegisterService {

    public constructor(
        @inject(TYPES.Database) private readonly database: Database,
        @inject(TYPES.Logger) private logger: ILogger
    ) {}

    public async getRegisters(params?: { [key: string]: string; }): Promise<RowDataPacket[]> {
        const result = await this.database.query('SELECT * FROM calls.register LIMIT ?', [1]);
        const registers = result[0] as RowDataPacket[];
        return registers;
    }
}

export default RegisterService;