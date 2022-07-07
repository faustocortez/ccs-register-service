export interface IRegisterService {
    insertMissingRegisters(table: string): Promise<void>;
}

/** { idRegistro }
 * This property is "bigint" type in the database,
 * so it means that it's a big number
 * therefore it need to be hold by a string type in code.
 */
export interface IRegister {
    idRegistro: string; // primary key auto_increment
    fecha: Date; // '0000-00-00'
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
