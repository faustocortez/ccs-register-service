
import { inject, injectable } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ormConfig } from '../core/data-source-config';
import { TYPES } from '../core/types';
import Logger from '../services/logger.service';
import { LoggerLevels } from '../interfaces/services/logger.interface';
import { Register } from '../entities/register.entity';

@injectable()
class Database {
    private static connection: DataSource;

    public constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

    public async getConnection(): Promise<DataSource> {
        this.logger.log(LoggerLevels.DEBUG, `Getting DataSource connection...`);

        if (Database.connection instanceof DataSource) return Database.connection;
        
        try {
            const config = {
                ...ormConfig,
                entities: [Register]
            } as DataSourceOptions;
            Database.connection = await new DataSource(config).initialize();
        } catch (error) {
            this.logger.log(LoggerLevels.DEBUG, 'Cannot establish database connection');
            this.logger.log(LoggerLevels.ERROR, error);
        }
        
        this.logger.log(LoggerLevels.DEBUG, `Connection established`);
        return Database.connection;
    }

    public async getRepository(repository: any): Promise<any> {
        const connection = await this.getConnection();
        return connection.getRepository(repository);
    }
}

export default Database;