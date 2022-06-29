
import { inject, injectable } from 'inversify';
import { DataSource } from 'typeorm';
import { Register } from '../entities/register.entity';
import { TYPES } from '../core/types';
import Logger from '../services/logger.service';
import { LoggerLevels } from '../interfaces/services/logger.interface';

// TODO: Make it ormconfig.json or env
const MysqlDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "root",
    database: "calls",
    entities: [Register],
    synchronize: true
});


@injectable()
class Database {
    private static connection: DataSource;

    public constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

    public async getConnection(): Promise<DataSource> {
        this.logger.log(LoggerLevels.DEBUG, `Getting DataSource connection...`);

        if (Database.connection instanceof DataSource) return Database.connection;
        
        try {
            Database.connection = await MysqlDataSource.initialize();
        } catch (error) {
            this.logger.log(LoggerLevels.DEBUG, 'Cannot establish database connection');
            this.logger.log(LoggerLevels.ERROR, error);
        }
        
        this.logger.log(LoggerLevels.DEBUG, `Connection established`);
        return Database.connection;
    }

    // public async getRepository(repository: any): Promise<any> {
    //     const connection = await this.getConnection();
    //     return connection.getRepository(repository);
    // }
}

export default Database;