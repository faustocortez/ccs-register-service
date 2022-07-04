import { Request } from "express";
import { id, inject } from "inversify";
import { BaseHttpController, controller, httpGet, queryParam, requestParam } from "inversify-express-utils";
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
        if ('idEvento' in params) params.idEvento
        console.log(LogLevel.DEBUG, req);
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => byFilter`);
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
            this.logger.log(LogLevel.DEBUG, `Register's agent: ${agente}`);
            if (currentIdAgent === agente) {
                this.logger.log(LogLevel.INFO, `Pushing register to agent: ${currentIdAgent}`);
                logsByAgent.push(register);
                if (index === (registers.length - 1)) {
                    this.logger.log(LogLevel.INFO, `Adding last array of registers: [${logsByAgent.length}]`);
                    mappedGroupPairs[agente] = [...logsByAgent];
                }
            } else {
                this.logger.log(LogLevel.INFO, `Total registers [${logsByAgent.length}] for agent ${currentIdAgent}`);
                mappedGroupPairs[currentIdAgent] = logsByAgent;
                currentIdAgent = agente;
                this.logger.log(LogLevel.INFO, `Updated currentIdAgent: ${currentIdAgent}`);
                logsByAgent = [register];
                this.logger.log(LogLevel.INFO, `Pushed first register for currentIdAgent: ${currentIdAgent}`);
            }
        });
        this.logger.log(LogLevel.DEBUG, `Grouped pairs logs => `, mappedGroupPairs, true);

        // Check if some pair log is missing
        let references: IPairRegisterReference[] = [];
        for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
            this.logger.log(LogLevel.DEBUG, `Id agent: ${agente}`);
            
            let register: IRegister = pairs[0];
            let { evento } = register;
            let events = {  0: 'Conectado', 1: 'Desconectado' };

            if (pairs.length === 1) {
                this.logger.log(LogLevel.DEBUG, `This agent only has one single register: ${evento}`, { ...pairs[0] }, true);
                this.logger.log(LogLevel.INFO, `Missing pair: ${evento === events[0] ? events[1] : evento}`)
                references.push({
                    agentId: agente,
                    missingPair: evento === events[0] ? events[1] : evento,
                    referencePair: register
                });
                this.logger.log(LogLevel.DEBUG, `finish pairs, reference:`, references, true);

                continue;
            }

            if (pairs.length % 2 !== 0) {
                let counter = 0;
                for (let index = 0; index < pairs.length; index++) {
                    register = pairs[index];
                    evento = register.evento;
                    this.logger.log(LogLevel.DEBUG, `ITERATION ${index}`, { counter, evento });
                    const event = events[counter]
                    switch (counter) {
                        case 0:
                            counter++;
                            if (evento === event) {
                                this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                                continue;
                            } else {
                                this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                                this.logger.log(LogLevel.INFO, `Missing pair: ${event}`);
                                this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);

                                references.push({
                                    agentId: agente,
                                    missingPair: event,
                                    referencePair: register
                                });
                            }
                            break;
                        case 1:
                            counter = evento === events[0] ? counter : 0;
                            if (evento === event) {
                                this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                                continue;
                            } else {
                                this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                                this.logger.log(LogLevel.INFO, `Missing pair: ${event}`);
                                this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                                
                                references.push({
                                    agentId: agente,
                                    missingPair: event,
                                    referencePair: register
                                });
                            }
                            break;
                    }
                }
                this.logger.log(LogLevel.DEBUG, `finish pairs, reference:`, references, true);
            } else {
                this.logger.log(LogLevel.INFO, `This agent "${agente}" has its logs complete`);
            }
        }
    }
}