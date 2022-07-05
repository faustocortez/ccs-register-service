import { Request } from "express";
import { inject } from "inversify";
import { BaseHttpController, controller, httpGet, queryParam } from "inversify-express-utils";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
import { IPairRegisterReference, IRegister } from "../interfaces/services/register.interface";
import Logger from "../services/logger.service";
import RegisterService from "../services/register.service";

@controller("/register")
export class RegisterController extends BaseHttpController {

    public constructor(
        @inject(TYPES.RegisterService) private registerService: RegisterService,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        super();
    }
  
    @httpGet("")
    public async index() {
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => index`);
        const registers = await this.registerService.getRegisters();
        return this.json({ registers });
    }

    @httpGet("/filter")
    public async byFilter(@queryParam('filter') filter: string) {
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => byFilter`);
        const registers = await this.registerService.getRegistersByFilter(filter);
        return this.json({ registers });
    }

    @httpGet("/params")
    public async byParams(req: Request) {
        const params = req.query;
        if ('idEvento' in params) {
            const idEvento = params.idEvento as string;
            params.idEvento = idEvento.split(',');
        }

        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => byParams`);
        const registers = await this.registerService.getRegistersByParams(params);
        return this.json({ registers });
    }

    @httpGet("/pairs")
    public async byPairs() {
        // Get registers pairs ("Conectado" y "Desconectado") order by agent
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => byPairs`);
        const registers = await this.registerService.getPairsOrderByAgent() as IRegister[];
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
                this.logger.log(LogLevel.DEBUG, `Total registers [${logsByAgent.length}] for agent ${currentIdAgent}`);
                mappedGroupPairs[currentIdAgent] = logsByAgent;
                currentIdAgent = agente;
                this.logger.log(LogLevel.DEBUG, `Updated currentIdAgent: ${currentIdAgent}`);
                logsByAgent = [register]; // first register of updated currentId
            }
        });
        this.logger.log(LogLevel.DEBUG, `Grouped pairs logs => `, mappedGroupPairs);

        // Searching pair log is missing
        let references: IPairRegisterReference[] = [];
        for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
            this.logger.log(LogLevel.DEBUG, `Id agent: ${agente}`);
            
            let register: IRegister = pairs[0];
            let { evento } = register;
            let events = {  0: 'Conectado', 1: 'Desconectado' };
            let missingPair: string;

            if (pairs.length === 1) {
                missingPair = evento === events[0] ? events[1] : events[0];
                this.logger.log(LogLevel.DEBUG, `This agent only has one single register: ${evento}`);
                this.logger.log(LogLevel.DEBUG, `Missing pair: ${missingPair}`);
                references.push({
                    agentId: agente,
                    missingPair,
                    [missingPair === events[0] ? 'currentPair' : 'previousPair']: register
                });

                continue;
            }

            let counter = 0;
            for (let index = 0; index < pairs.length; index++) {
                register = pairs[index];
                evento = register.evento;
                this.logger.log(LogLevel.DEBUG, `ITERATION ${index}`, { counter, evento });
                const event = events[counter]
                switch (counter) {
                    case 0:
                        if (evento === event) {
                            counter++;
                            this.logger.log(LogLevel.DEBUG, `counter = ${counter} go to next iteration ${(index + 1)}`);
                            if ((pairs.length - 1) === index) {
                                let reference = {
                                    currentPair: register,
                                    previousPair: pairs[index === 0 ? 0 : (index - 1)]
                                };
                                references.push({
                                    agentId: agente,
                                    missingPair: events[1],
                                    ...reference
                                });
                            }
                            continue;
                        } else {
                            counter = 0;
                            this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event}`);
                            this.logger.log(LogLevel.DEBUG, `counter = ${counter} go to next iteration ${(index + 1)}`);
                            let reference = {
                                currentPair: register,
                                previousPair: pairs[index === 0 ? 0 : (index - 1)]
                            };

                            references.push({
                                agentId: agente,
                                missingPair: event,
                                ...reference
                            });
                        }
                        break;
                    case 1:
                        counter = evento === events[0] ? counter : 0;
                        if (evento === event) {
                            this.logger.log(LogLevel.DEBUG, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                            continue;
                        } else {
                            this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event}`);
                            this.logger.log(LogLevel.DEBUG, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                            let reference = {
                                currentPair: register,
                                previousPair: pairs[index === 0 ? 0 : (index - 1)]
                            };
                            references.push({
                                agentId: agente,
                                missingPair: event,
                                ...reference
                            });
                        }
                        break;
                }
            }
        }
        this.logger.log(LogLevel.DEBUG, `Finish pairs, reference:`, references);
        
        // Check if some pair log is missing
        // if (references.length) {
        //     for (let index = 0; index < references.length; index++) {
        //         const reference = references[index];
        //         const { agentId, missingPair } = reference;
        //         console.log('missingPair', missingPair);
        //         switch (missingPair) {
        //             case 'Desconectado':
        //                 let minDate = reference?.previousPair?.inicia ?? '00:00:00'; // ask for default
        //                 let maxDate = reference.currentPair.inicia;
        //                 let query  =  `SELECT * FROM register WHERE agente="${agentId}" AND inicia BETWEEN "${minDate}" AND "${maxDate}"`;
        //                 console.log('queyr', query);
        //                 const registers = await this.registerService.getDbQuery(query) as IRegister[];
        //                 const penultimateLog = registers[registers.length - 2];
        //                 let logToAdd: IRegister = {

        //                 };
        //                 if (penultimateLog.evento === 'loguear') {
        //                     // restar un seg del penultimo inicia para el terminar
        //                     // sumar un seg del antepenultimo termina para el inicio
        //                 }
                        
        //                 break;
                
        //             // default:
        //             //     let minDate2 = reference?.previousPair?.inicia ?? '00:00:00';
        //             //     let maxDate2 = reference.currentPair.inicia;
        //             //     let query2  =  `SELECT * FROM register WHERE agente="${agentId}" AND inicia BETWEEN "${minDate2}" AND "${maxDate2}"`;
                        
        //             //     // const registers2 = await this.registerService.getDbQuery(query2);
        //             //     break;
        //         }
                
        //     }
        // } else {
        //     this.logger.log(LogLevel.DEBUG, `Theres not missed logs`);
        // }
    }

    @httpGet("/query")
    public async byQuery(@queryParam('q') q: string) {
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => byQuery`);
        const registers = await this.registerService.getDbQuery(q);
        return this.json({ registers });
    }
}