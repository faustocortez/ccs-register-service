import { inject } from "inversify";
import { BaseHttpController, controller, httpGet } from "inversify-express-utils";
import { format, addSeconds } from "date-fns";
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
        for (const [agente, pairs] of Object.entries(mappedGroupPairs)) {
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
                references.push({
                    agentId: agente,
                    missingPair,
                    [missingPair === events[0] ? 'currentPair' : 'previousPair']: register
                });
                continue;
            }
            // CASE: "agente" has many registers
            this.logger.log(LogLevel.DEBUG, `Has many registers [${pairs.length}]`);
            let counter = 0;
            for (let index = 0; index < pairs.length; index++) {
                const event = events[counter];
                register = pairs[index];
                evento = register.evento;

                // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
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
                            }
                            continue;
                        } else {
                            counter = 0;
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} index ${index}\n`);

                            references.push({
                                agentId: agente,
                                missingPair: event,
                                currentPair: register,
                                ...(index !== 0 && { previousPair: pairs[(index - 1)] })
                            });
                        }
                        break;
                    case 1:
                        counter = evento === events[0] ? counter : 0;
                        if (evento === event) continue;
                        else {
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} index ${index}\n`);
                            let reference = {
                                currentPair: register,
                                previousPair: pairs[index !== 0 ? (index - 1) : 0]
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

        // Calculate dates for "inicia" and "termina" to create and insert the missing register
        if (references.length) {
            for (let index = 0; index < references.length; index++) {
                const reference = references[index];
                const { agentId, missingPair } = reference;
                this.logger.log(LogLevel.DEBUG, `Missing pair of "agente" ${agentId}: ${missingPair}`, references[index] as unknown as Record<string, unknown>);
                let minDate: string; // ask for default
                let maxDate: string; // ask for default
                let query: string;
                let registers: IRegister[];
                let pairToInsert = {} as IRegister;
                
                if (missingPair === events[1]) {
                    minDate = reference?.previousPair?.inicia ?? '00:00:00'; // ask for default
                    maxDate = reference?.currentPair?.inicia;
                    const andIniciaLowerThan = maxDate ? ` AND inicia < "${maxDate}"` : '';
                    query  = `SELECT * FROM datos1 WHERE agente="${agentId}" AND inicia > "${minDate}"${andIniciaLowerThan}`;
                    registers = await this.registerService.getDbQuery(query) as IRegister[];
                    if (registers.length > 2) {
                        this.logger.log(LogLevel.DEBUG, 'many missing');
                        const penultimateLog = registers[registers.length - 2];
                        if (penultimateLog.evento === 'loguear') {
                            // restar un seg del penultimo inicia para el terminar
                            // sumar un seg del antepenultimo termina para el inicio
                        }
                    } else {
                        // It means that the "agente" only has one pair
                        // create missing register
                        this.logger.log(LogLevel.DEBUG, `datetime : ${reference.previousPair.fecha} ${minDate}`);
                        const sum: Date = addSeconds(new Date(`${reference.previousPair.fecha} ${minDate}`), 1);
                        this.logger.log(LogLevel.DEBUG, `sum date: ${sum}`);
                        const startDate = format(sum, 'HH:mm:ss');
                        this.logger.log(LogLevel.DEBUG, `start date: ${startDate}`);
                        pairToInsert = {
                            ...reference.previousPair,
                            idEvento: 300,
                            evento: missingPair,
                            inicia: startDate
                        }
                        delete pairToInsert.idRegistro;
                        console.log(`new`, pairToInsert);
                        // const nr = await this.registerService.getDbQuery('CREATE ');
                    }
                }   
            }
        } else {
            this.logger.log(LogLevel.DEBUG, `Theres not missed logs`);
        }
    }
}