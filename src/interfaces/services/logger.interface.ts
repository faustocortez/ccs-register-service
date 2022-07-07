export interface ILogger {
    log(level: LogLevel, message: string, data?: Array<unknown> | Object | any, pretty?: boolean): void;
}

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    ERROR = 'ERROR'
}