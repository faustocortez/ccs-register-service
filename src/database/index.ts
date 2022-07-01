
import { inject, injectable } from 'inversify';
import dotenv from 'dotenv';
import { createPool, Pool } from 'mysql2/promise';
import { TYPES } from '../core/types';
import Logger from '../services/logger.service';
import { LogLevel } from '../interfaces/services/logger.interface';

dotenv.config();
@injectable()
class Database {
    private static connection: Pool;

    public constructor(@inject(TYPES.Logger) private logger: Logger) {}

    public async getConnection(): Promise<Pool> {
        this.logger.log(LogLevel.DEBUG, `Getting DataSource connection...`);

        if (Database.connection instanceof Database) {
            this.logger.log(LogLevel.DEBUG, `DB already connected`);
            return Database.connection
        }
        
        try {
            Database.connection = createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                connectionLimit: Number(process.env.DB_CONNECTION_LIMIT)
            });
            this.logger.log(LogLevel.DEBUG, `Connection established`);
        } catch (error) {
            this.logger.log(LogLevel.DEBUG, 'Cannot establish database connection');
            this.logger.log(LogLevel.ERROR, error);
        }
        
        return Database.connection;
    }

    public async query(query: string, preparedStatements?: (string | number | unknown)[]) {
        const { connection } = Database;
        return (preparedStatements) ? connection.query(query, preparedStatements) : connection.query(query);
    }
}

export default Database;