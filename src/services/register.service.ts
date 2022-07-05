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
    
    public async getPairsOrderedByAgent(): Promise<RowDataPacket[]> {
        // Pairs are those registers that have either "Conectado"
        // or "Desconectado" value in "evento" property.
        this.logger.log(LogLevel.DEBUG, 'Getting pairs in MySQL DB');
        const result = await this.database.query("SELECT * FROM datos1 WHERE idEvento IN (4,300) ORDER BY agente;");
        const response = result[0] as RowDataPacket[];
        // Excluding registers with "agente" = 0
        let registers: RowDataPacket[] = [];
        for (let i = 0; i < response.length; i++) {
            const { agente } = response[i];
            if (agente != '0') registers.push(response[i]);
        }
        this.logger.log(LogLevel.DEBUG, `Query pairs result [${registers.length}]:`);
        
        return registers;
    }
}

export default RegisterService;