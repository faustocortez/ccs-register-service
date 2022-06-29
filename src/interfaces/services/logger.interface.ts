export interface ILogger {
    log(level: LoggerLevels, message: string, data?: Array<unknown> | Record<string, unknown> ): void;
}

export enum LoggerLevels {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    ERROR = 'ERROR'
}