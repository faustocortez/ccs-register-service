
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

        if (Database.connection instanceof Database) return Database.connection;
        
        try {
            Database.connection = createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                connectionLimit: Number(process.env.DB_CONNECTION_LIMIT)
            });
        } catch (error) {
            this.logger.log(LogLevel.DEBUG, 'Cannot establish database connection');
            this.logger.log(LogLevel.ERROR, error);
        }
        
        this.logger.log(LogLevel.DEBUG, `Connection established`);
        return Database.connection;
    }

    public async query(query: string, preparedStatements: (string | number)[]) {
        const connection = await this.getConnection();
        return connection.query(query, preparedStatements);
    }
}

export default Database;