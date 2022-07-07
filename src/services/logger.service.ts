import 'reflect-metadata';
import { injectable } from 'inversify';
import { ILogger, LogLevel } from '../interfaces/logger.interface';

@injectable()
class Logger implements ILogger{
    public log(
      level: LogLevel,
      message: string,
      data?: Array<unknown> | Object | any,
      pretty?: boolean
    ): void {
      const time = new Date().toISOString();
      const log = `${time} - [${level}]: ${message}`;
      console.log(log);
      if (data && !pretty) console.log(JSON.stringify(data));
      if (data && pretty) console.log(data);
    }
}

export default Logger;