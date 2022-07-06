import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { IRegister, IRegisterService } from '../interfaces/services/register.interface';
import { ILogger, LogLevel } from '../interfaces/services/logger.interface';
import { TYPES } from '../core/types';
import Database from '../database';

@injectable()
class RegisterService implements IRegisterService {

    public constructor(
        @inject(TYPES.Database) private readonly database: Database,
        @inject(TYPES.Logger) private logger: ILogger
    ) {}
    
    public async getAllEventPairsOrderedByAgent(table: string): Promise<IRegister[] | []> {
        // Pairs are those registers that have either "Conectado" or "Desconectado" value in "evento" property.
        this.logger.log(LogLevel.DEBUG, `Getting registers from ${table} in database...`);
        try {
            const result = await this.database.query(`SELECT * FROM ${table} WHERE idEvento IN (4,300) ORDER BY agente ASC, inicia ASC;`);
            const response = result[0] as RowDataPacket[];
            // Excluding registers with "agente" = 0
            this.logger.log(LogLevel.DEBUG, `Query pairs result [${response.length}]`);
            const registers: IRegister[] = this.filterInvalidAgentsRegisters(response);
            
            return registers;
        } catch (error) {
            this.logger.log(LogLevel.ERROR, error.message, error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    public async getDbQuery(query: string, preparedValues?: unknown[]): Promise<RowDataPacket[]> {
        // this.logger.log(LogLevel.DEBUG, `Getting query: ${ query }`);
        const result = await this.database.query(query, preparedValues);
        const registers = result[0] as RowDataPacket[];
        this.logger.log(LogLevel.DEBUG, `Query agents result [${registers.length}]`);
        
        return registers;
    }

    public async insertMissingRegister(reference: IRegister, missingPair: string, startTime: string): Promise<ResultSetHeader> {
        const { idRegistro, ...data } = reference;
        const missingRegister = {
            ...data,
            evento: missingPair,
            idEvento: missingPair === 'Conectado' ? 4 : 300,
            inicia: startTime
        };
        const values = Object.values(missingRegister).map(v => `"${v}"`);
        const query = `INSERT INTO datos (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
        this.logger.log(LogLevel.DEBUG, `$query: ${query}\n`);
        const result = await this.database.query(query) as unknown as ResultSetHeader;

        return result;
    }

    private filterInvalidAgentsRegisters(rowData: RowDataPacket[]): IRegister[] {
        let registers: IRegister[] = [];
        if (rowData.length) {
            for (let i = 0; i < rowData.length; i++) {
                const { agente } = rowData[i];
                if (agente != '0') registers.push(rowData[i] as IRegister);
            }
        }
        this.logger.log(LogLevel.DEBUG, `Filtered registers [${registers.length}]`);
        return registers;
    }
}

export default RegisterService;