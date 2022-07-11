import { JsonResult } from "inversify-express-utils/lib/results";

// SERVICE
export interface IRegisterService {
    insertMissingRegisters(table: string, date: string): Promise<IMissingRegister[] | []>;
}

/** { idRegistro }
 * This property is "bigint" type in the database,
 * so it means that it's a big number
 * therefore it need to be hold by a string type in code.
 */
export interface IRegister {
    idRegistro: string; // primary key auto_increment
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
    id: string; // idRegistro
    agentId: string; // "agente"
    event: string; // missing register
    date: string | Date; // fecha
    startTime: string; // computed value "inicia",
    reference: {
        id: string; // idRegistro
        event: string; // evento
        date: string | Date; // fecha
        startTime: string; // inicia
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
    insertedRegisters?: IMissingRegister[];
}