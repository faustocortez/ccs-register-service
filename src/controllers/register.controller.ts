import { inject } from "inversify";
import { BaseHttpController, controller, httpGet } from "inversify-express-utils";
import { format, addSeconds, subSeconds } from "date-fns";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
import { IPairRegisterReference, IRegister } from "../interfaces/services/register.interface";
import Logger from "../services/logger.service";
import RegisterService from "../services/register.service";

@controller("/service/v1/register")
export class RegisterController extends BaseHttpController {

    public constructor(
        @inject(TYPES.RegisterService) private registerService: RegisterService,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        super();
    }

    @httpGet("/pairs")
    public async addMissedPair() {
        // Get registers pairs ("Conectado" y "Desconectado") order by agent
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => addMissedPair()`);
        const registers = await this.registerService.getPairsOrderedByAgent() as IRegister[];
        if (!registers) {
            const message = 'Theres no registers found!'
            this.logger.log(LogLevel.ERROR, message, registers);
            throw new Error(message);
        }

        // Map agent ids ("agente") from obtained registers
        this.logger.log(LogLevel.DEBUG, `Map agents ids from pairs registers [${registers.length}]`);
        let agentIds: string[] = registers.map(({ agente }) => agente);
        agentIds = Array.from(new Set(agentIds));
        this.logger.log(LogLevel.DEBUG, `Mapped agents ids: [${agentIds.length}]`, agentIds);
        
        // Group pairs in arrays by agent id
        let mappedGroupPairs: { [key: string]: IRegister[] } = {};
        let currentIdAgent: string = agentIds[0];
        let logsByAgent: IRegister[] = [];
        this.logger.log(LogLevel.DEBUG, `Group pairs registers by agent id ${currentIdAgent}`);
        registers.forEach((register, index) => {
            const { agente } = register;
            if (currentIdAgent === agente) {
                logsByAgent.push(register);
                if (index === (registers.length - 1)) {
                    this.logger.log(LogLevel.DEBUG, `Adding last array of registers: [${logsByAgent.length}]`);
                    mappedGroupPairs[agente] = [...logsByAgent];
                }
            } else {
                this.logger.log(LogLevel.DEBUG, `Total registers for agent ${currentIdAgent} = [${logsByAgent.length}]`);
                mappedGroupPairs[currentIdAgent] = logsByAgent;
                currentIdAgent = agente;
                this.logger.log(LogLevel.DEBUG, `Updated currentIdAgent: ${currentIdAgent}`);
                logsByAgent = [register]; // first register of updated currentId
            }
        });
        this.logger.log(LogLevel.DEBUG, `Grouped pairs logs => `, mappedGroupPairs);

        // Searching pair log is missing
        this.logger.log(LogLevel.DEBUG, `Finding missing register of the pair...`);
        let references: IPairRegisterReference[] = [];
        let events = {  0: 'Conectado', 1: 'Desconectado' };
        let missingRegister: IRegister;
        for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
            if (agente == '51') {
                this.logger.log(LogLevel.DEBUG, `Current "agente" value: ${agente}`);
                let register: IRegister = pairs[0];
                let { evento } = register;
                let missingPair: string;
    
                // CASE: "agente" only have one register
                this.logger.log(LogLevel.DEBUG, `Checking if array of pairs only have 1 register`);
                if (pairs.length === 1) {
                    missingPair = evento === events[0] ? events[1] : events[0];
                    this.logger.log(LogLevel.DEBUG, `Array only has one single register: ${evento}`);
                    this.logger.log(LogLevel.DEBUG, `Missing pair: ${missingPair}\n`);
                    // this.logger.log(LogLevel.DEBUG, `Creating missing register...`);
    
                    // let { inicia, fecha } = register;
                    // console.log(format(addSeconds(new Date(`${fecha} ${inicia}`), 1), 'HH:mm:ss'));
                    // let query = `SELECT * FROM datos1 WHERE agente="${agente}" AND idEvento NOT IN (4,300) AND inicia > "${inicia}" ORDER BY inicia ASC;`;
                    // const result = await this.registerService.getDbQuery(query) as IRegister[];
                    // let startTime: string;
                    // console.log(result);
                    // if (result.length > 1) {
                    //     const lastLog = result[result.length - 1];
                    //     // if idEvento = loguear
                    //     if (lastLog.idEvento == 3) {
                    //         // restar un seg del penultimo inicia para el terminar
                    //         // sumar un seg del antepenultimo termina para el inicio
    
                    //     } else {
                    //         console.log('else', lastLog.inicia, format(addSeconds(new Date(`${lastLog.fecha} ${lastLog.inicia}`), 1), 'HH:mm:ss'));
                    //         missingRegister = {
                    //             ...register,
                    //             evento: missingPair,
                    //             idEvento: 300,
                    //             inicia: format(addSeconds(new Date(`${lastLog.fecha} ${lastLog.inicia}`), 1), 'HH:mm:ss')
                    //         };
                    //         delete missingRegister.idRegistro;
                    //         let values = Object.values(missingRegister);
                    //         values = values.map(v => `"${v}"`);
                    //         console.log(values);
                    //         query = `INSERT INTO datos1 (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
                    //         console.log(query);
                    //         const insert = await this.registerService.getDbQuery(query);
                    //         console.log(insert);
                    //     }
                    // }
                    // missingRegister = {
                    //     ...register,
                    //     evento: missingPair,
                    //     idEvento: 300,
                    //     inicia: format(addSeconds(new Date(`${fecha} ${inicia}`), 1), 'HH:mm:ss')
                    // };
                    this.logger.log(LogLevel.DEBUG, `missingRegister`, missingRegister, true);
                    continue;
                }
                // CASE: "agente" has many registers
                this.logger.log(LogLevel.DEBUG, `Has many registers [${pairs.length}]\n`);
                let counter = 0;
                for (let index = 0; index < pairs.length; index++) {
                    const event = events[counter];
                    register = pairs[index];
                    evento = register.evento;
                    console.log('eee', evento, event);
    
                    // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
                    this.logger.log(LogLevel.DEBUG, `Validating event: ${event} | Input: ${evento}`);
                    switch (counter) {
                        case 0:
                            if (evento === event) {
                                counter++;
                                if ((pairs.length - 1) === index) {
                                    this.logger.log(LogLevel.DEBUG, `Event "${evento}" found but its the last register, means that "${events[1]}" is missing\n`);
                                    references.push({
                                        agentId: agente,
                                        missingPair: events[1],
                                        currentPair: register,
                                        ...(index !== 0 && { previousPair: pairs[(index - 1)] })
                                    });
                                    continue;
                                }
                                this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                            } else {
                                counter = 0;
                                this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                                this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} | Array index: ${index}`);
                                this.logger.log(LogLevel.DEBUG, `Creating ${event}...\n`);
    
                                let { inicia, fecha } = pairs[index-1];
                                let query = `SELECT * FROM datos1 WHERE (inicia BETWEEN "${inicia}" AND "${register.inicia}") AND agente="${agente}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
                                const result = await this.registerService.getDbQuery(query) as IRegister[];
                                let startTime: string;
                                if (result[0].evento === 'loguear') {
                                    startTime = format(addSeconds(new Date(`${result[0].fecha} ${result[0].inicia}`), 1), 'HH:mm:ss');
                                } else {
                                    // insertart "loguear" y "Conectado"
                                    console.log('no tiene loguear ');
                                }
                                missingRegister = {
                                    ...register,
                                    evento: event,
                                    idEvento: 4,
                                    inicia: startTime
                                };
                                delete missingRegister.idRegistro;
                                let values = Object.values(missingRegister);
                                values = values.map(v => `"${v}"`);
                                console.log(values);
                                query = `INSERT INTO datos1 (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
                                console.log(query);
                                // if (result.length > 1) {
                                //     const lastLog = result[result.length - 1];
                                //     // if idEvento = loguear
                                //     if (lastLog.idEvento == 3) {
                                //         // restar un seg del penultimo inicia para el terminar
                                //         // sumar un seg del antepenultimo termina para el inicio
                
                                //     } else {
                                //         console.log('else', lastLog.inicia, format(addSeconds(new Date(`${lastLog.fecha} ${lastLog.inicia}`), 1), 'HH:mm:ss'));
                                //         missingRegister = {
                                //             ...register,
                                //             evento: missingPair,
                                //             idEvento: 300,
                                //             inicia: format(addSeconds(new Date(`${lastLog.fecha} ${lastLog.inicia}`), 1), 'HH:mm:ss')
                                //         };
                                //         delete missingRegister.idRegistro;
                                //         let values = Object.values(missingRegister);
                                //         values = values.map(v => `"${v}"`);
                                //         console.log(values);
                                //         query = `INSERT INTO datos1 (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
                                //         console.log(query);
                                //         // const insert = await this.registerService.getDbQuery(query);
                                //     }
                                // }
                            }
                            break;
                        case 1:
                            counter = evento === events[0] ? counter : 0;
                            if (evento !== event) {
                                this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                                this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} index ${index}`);
                                this.logger.log(LogLevel.DEBUG, `Creating ${event}...\n`);
    
                                let { inicia, fecha } = register;
                                // console.log(format(subSeconds(new Date(`${fecha} ${inicia}`), 1), 'HH:mm:ss'));
                                let query = `SELECT * FROM datos1 WHERE agente="${agente}" AND idEvento NOT IN (4,300) AND inicia < "${inicia}" ORDER BY inicia ASC;`;
                                const result = await this.registerService.getDbQuery(query) as IRegister[];
                                let startTime: string;
                                if (result.length > 1) {
                                    const referenceLog = result[result.length - 1];;
                                    // if ((pairs.length - 1) === index) {
                                    //     referenceLog = result[result.length - 1];
                                    // } else {
                                    //     referenceLog = pairs[index + 1];
                                    // }
                                    console.log(referenceLog);
                                    // if idEvento = loguear
                                    if (referenceLog.idEvento == 3) {
                                        startTime = format(subSeconds(new Date(`${referenceLog.fecha} ${referenceLog.inicia}`), 1), 'HH:mm:ss');
                                        missingRegister = {
                                            ...register,
                                            evento: event,
                                            idEvento: 300,
                                            inicia: startTime
                                        };
                                        delete missingRegister.idRegistro;
                                        let values = Object.values(missingRegister);
                                        values = values.map(v => `"${v}"`);
                                        query = `INSERT INTO datos1 (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
                                        console.log(query);
                                    } else {
                                        console.log('else', referenceLog.inicia, format(addSeconds(new Date(`${referenceLog.fecha} ${referenceLog.inicia}`), 1), 'HH:mm:ss'));
                                        startTime = format(addSeconds(new Date(`${referenceLog.fecha} ${referenceLog.inicia}`), 1), 'HH:mm:ss');
                                        missingRegister = {
                                            ...register,
                                            evento: missingPair,
                                            idEvento: 300,
                                            inicia: startTime
                                        };
                                        delete missingRegister.idRegistro;
                                        let values = Object.values(missingRegister);
                                        values = values.map(v => `"${v}"`);
                                        query = `INSERT INTO datos1 (fecha, inicia, fechaFinal, termina, dura, ip, estacion, idEvento, evento, estadoEvento, Telefono, ea, agente, Password, grabacion, servicio, identificador, idCliente, fechaIng) VALUES(${values.toString()})`;
                                        console.log(query);
                                        // const insert = await this.registerService.getDbQuery(query);
                                    }
                                }
                                continue;
                            }
                            this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                            break;
                    }
                }   
            }
        }
        this.logger.log(LogLevel.DEBUG, `Total missed registers: [${references.length}]\n`);
    }
}