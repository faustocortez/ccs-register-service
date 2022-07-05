import { inject } from "inversify";
import { BaseHttpController, controller, httpGet } from "inversify-express-utils";
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
        this.logger.log(LogLevel.DEBUG, `Finding missing pair registers...`);
        let references: IPairRegisterReference[] = [];
        for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
            this.logger.log(LogLevel.DEBUG, `Current "agente" value: ${agente}`);
            
            let register: IRegister = pairs[0];
            let { evento } = register;
            let events = {  0: 'Conectado', 1: 'Desconectado' };
            let missingPair: string;

            // CASE: "agente" only have one register
            this.logger.log(LogLevel.DEBUG, `Checking if array of pairs only have 1 register`);
            if (pairs.length === 1) {
                missingPair = evento === events[0] ? events[1] : events[0];
                this.logger.log(LogLevel.DEBUG, `Array only has one single register: ${evento}`);
                this.logger.log(LogLevel.DEBUG, `Missing pair: ${missingPair}\n`);
                references.push({
                    agentId: agente,
                    missingPair,
                    [missingPair === events[0] ? 'currentPair' : 'previousPair']: register
                });
                continue;
            }
            // CASE: "agente" have many registers
            this.logger.log(LogLevel.DEBUG, `Has many registers [${pairs.length}]`);
            let counter = 0;
            this.logger.log(LogLevel.DEBUG, `Start checking which register is missing...`,);
            for (let index = 0; index < pairs.length; index++) {
                const event = events[counter];
                register = pairs[index];
                evento = register.evento;

                // Validate which register.evento is the missing one ("Conectado" or "Desconectado")
                switch (counter) {
                    case 0:
                        if (evento === event) {
                            counter++;
                            if ((pairs.length - 1) === index) {
                                this.logger.log(LogLevel.DEBUG, `Event "${evento}" found but its the last register, means that "${events[1]}" is missing\n`);
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
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event}\n`);
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
                        if (evento === event) continue;
                        else {
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event}\n`);
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
        this.logger.log(LogLevel.DEBUG, `Total missed registers: [${references.length}]`, references);
    }
}