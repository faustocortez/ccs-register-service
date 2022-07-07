import 'reflect-metadata';
import { injectable } from 'inversify';
import { ILogger, LogLevel } from '../interfaces/logger.interface';
@injectable()
class Logger implements ILogger{
  
  private prettyLogs: boolean;

  public constructor() {
    this.prettyLogs = Boolean(Number(process.env.PRETTY_LOGS));
  }
  
  public log(
    level: LogLevel,
    message: string,
    data?: Array<unknown> | Object | any,
  ): void {
    const time = new Date().toISOString();
    const prefix = `${time} - [${level}]:`;
    const log = `${prefix} ${message}`;
    console.log(log);

    if (data && !this.prettyLogs) console.log(prefix, JSON.stringify(data));
    if (data && this.prettyLogs) console.log(prefix, data);
  }
}

export default Logger;