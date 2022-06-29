
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
    entities: [Register]
});


@injectable()
class Database {
    private static connection: DataSource;

    public constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

    public async getConnection(): Promise<DataSource> {
        if (Database.connection instanceof DataSource) return Database.connection;

        try {
            Database.connection = await MysqlDataSource.initialize();
            this.logger.log(LoggerLevels.DEBUG, `Connection established`);
        } catch (error) {
            this.logger.log(LoggerLevels.DEBUG, 'Cannot establish database connection');
            this.logger.log(LoggerLevels.ERROR, error);
        }

        return Database.connection;
    }

    // public async getRepository(repository: any): Promise<any> {
    //     const connection = await this.getConnection();
    //     return connection.getRepository(repository);
    // }
}

export default Database;