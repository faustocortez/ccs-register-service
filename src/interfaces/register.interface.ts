import { JsonResult } from 'inversify-express-utils/lib/results';

// SERVICE
export interface IRegisterService {
    insertMissingRegisters(table: string, date: string): Promise<IMissingRegister[]>;
}

export enum Defaults {
    TimeFormat = 'HH:mm:ss', // based on current date library [https://date-fns.org/v2.28.0/docs/format]
    DateFormat = 'yyyy-MM-dd', // based on current date library [https://date-fns.org/v2.28.0/docs/format]
    TimeValue = '00:00:00',
    DateValue = '0000-00-00',
    WorkingDayStartTime = '06:00:00',
    TableMonthDateFormat = 'yyyyMM',
    Connected = 'Conectado',
    Disconnected = 'Desconectado',
    Add = 'ADD',
    Sub = 'SUB',
    InvalidAgentId = '0'
}

export interface IRegister {
    idRegistro: number; // primary key auto_increment
    fecha: string |  Date; // '0000-00-00'
    inicia: string; // '00:00:00'
    fechaFinal: Date; // '0000-00-00'
    termina: string; // '00:00:00'
    dura: string; // '00:00:00'
    ip: string;
    estacion: number; // 0
    idEvento: number; // 0
    evento: string; // 0
    estadoEvento: string;
    Telefono: string;
    ea: string;
    agente: string;
    Password: string;
    grabacion: string;
    servicio: string;
    identificador: string;
    idCliente: string;
    fechaIng: Date; // '0000-00-00'
}

export interface IMissingRegister {
    agentId: string;
    inserted: boolean;
    missingRegister: {
        id: number; // idRegistro
        event: string; // missing register
        date: string | Date; // fecha
        startTime: string; // computed value "inicia",
        service: string; // servicio
    }
    existingRegister: {
        id: number; // idRegistro
        event: string; // existing register
        date: string | Date; // fecha
        startTime: string; // computed value "inicia",
        service: string; // servicio
    }
}

export enum RegisterEvents {
    Loguear = 3,
    Conectado = 4,
    Codificado = 7,
    Estado = 8,
    Desconectado = 300
}

// CONTROLLER
export interface IRegisterController {
    insertMissingEventRegisters(body: { date: string }): Promise<JsonResult>;
}

export interface IRegisterControllerResponse {
    message: string;
    data?: IMissingRegister[];
    error?: string;
}