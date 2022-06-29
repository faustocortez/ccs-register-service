import 'reflect-metadata';
import { injectable } from 'inversify';
import { ILogger, LoggerLevels } from '../interfaces/services/logger.interface';

@injectable()
class Logger implements ILogger{
    public log(level: LoggerLevels, message: string, data?: Array<unknown> | Record<string, unknown> ): void {
      const time = new Date().toISOString();
      const log = `${time} - [${level}]: ${message}`;
      console.log(log);
      if (data) console.log(JSON.stringify(data, null, 2));
    }
}

export default Logger;