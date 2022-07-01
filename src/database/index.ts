
import { inject, injectable } from 'inversify';
import dotenv from 'dotenv';
import { createPool, Pool } from 'mysql2/promise';
import { TYPES } from '../core/types';
import Logger from '../services/logger.service';
import { LoggerLevels } from '../interfaces/services/logger.interface';

dotenv.config();
export async function connect() {
    console.log(LoggerLevels.DEBUG, `Getting DataSource connection...`);
    const connection = await createPool({
        host: 'localhost',
        user: 'root',
        password: 'mysqlserver!!',
        database: 'calls',
        connectionLimit: 10
    });
    console.log(LoggerLevels.DEBUG, `connected`);

    return connection;
}
// @injectable()
// class Database {
//     private static connection: Pool;

//     public async getConnection(): Promise<Pool> {
//         // this.logger.log(LoggerLevels.DEBUG, `Getting DataSource connection...`);

//         if (Database.connection instanceof Database) return Database.connection;
        
//         try {
//             Database.connection = await createPool({
//                 host: process.env.HOST,
//                 user: process.env.USER,
//                 password: process.env.PASSWORD,
//                 database: process.env.DATABASE,
//                 connectionLimit: Number(process.env.CONNECTION_LIMIT)
//             });
//         } catch (error) {
//             // this.logger.log(LoggerLevels.DEBUG, 'Cannot establish database connection');
//             // this.logger.log(LoggerLevels.ERROR, error);
//         }
        
//         // this.logger.log(LoggerLevels.DEBUG, `Connection established`);
//         return Database.connection;
//     }
// }

// export default Database;