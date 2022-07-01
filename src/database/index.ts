
import dotenv from 'dotenv';
import { createPool, Pool } from 'mysql2/promise';
import { TYPES } from '../core/types';
import Logger from '../services/logger.service';
import { LogLevel } from '../interfaces/services/logger.interface';

dotenv.config();

export async function connect() {
    console.log(LogLevel.DEBUG, `Getting DataSource connection...`);
    const connection = await createPool({
        host: 'localhost',
        user: 'root',
        password: '9b289300!A',
        database: 'calls',
        connectionLimit: 10
    });
    console.log(LogLevel.DEBUG, `connected`);

    return connection;
}