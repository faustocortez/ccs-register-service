import { inject } from "inversify";
import { BaseHttpController, controller, httpGet } from "inversify-express-utils";
import { format, addSeconds, subSeconds } from "date-fns";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
import { IPairRegisterReference, IRegister } from "../interfaces/services/register.interface";
import Logger from "../services/logger.service";
import RegisterService from "../services/register.service";

@controller("/service/v1")
export class RegisterController extends BaseHttpController {

    public constructor(
        @inject(TYPES.RegisterService) private registerService: RegisterService,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        super();
    }

    @httpGet("/registers")
    public async insertMissingEventRegisters() {
        // Get registers pairs ("Conectado" y "Desconectado") order by agent
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => insertMissingEventRegisters()`);
        const registers = await this.registerService.getAllEventPairsOrderedByAgent('datos');
        if (!registers.length) {
            const message = 'Theres no registers found!'
            this.logger.log(LogLevel.INFO, message, registers);
            throw new Error(message);
        }

        // Map agent ids ("agente") from obtained registers
        this.logger.log(LogLevel.DEBUG, `Map agents ids from event pairs registers [${registers.length}]`);
        let agentIds: string[] = registers.map(({ agente }) => agente);
        this.logger.log(LogLevel.DEBUG, `Mapped agents: [${agentIds.length}]`, agentIds);
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
            this.logger.log(LogLevel.DEBUG, `Current "agente" value: ${agente}`);
            let register: IRegister = pairs[0];
            let { evento } = register;
            let counter = 0;
            for (let index = 0; index < pairs.length; index++) {
                const event = events[counter];
                register = pairs[index];
                evento = register.evento;

                // Validate which register.evento is the missing one ("Conectado" = 0 or "Desconectado" = 1)
                this.logger.log(LogLevel.DEBUG, `Validating event: ${event} | Input: ${evento}`);
                switch (counter) {
                    case 0:
                        if (evento === event) {
                            counter++;
                            if ((pairs.length - 1) === index) {
                                this.logger.log(LogLevel.DEBUG, `Event "${evento}" found but its the last register, it means that "${events[1]}" is missing`);
                                this.logger.log(LogLevel.DEBUG, `Creating ${events[1]}...`);
                                
                                let { inicia, fecha } = register;
                                const startTime: string = format(addSeconds(new Date(`${fecha} ${inicia}`), 1), 'HH:mm:ss');
                                const inserted = await this.registerService.insertMissingRegister(register, events[1], startTime);
                                continue;
                            }
                            this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                        } else {
                            counter = 0;
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} | Array index: ${index}`);
                            this.logger.log(LogLevel.DEBUG, `Creating ${event}...`);
                            
                            let startTime: string = format(subSeconds(new Date(`${register.fecha} ${register.inicia}`), 1), 'HH:mm:ss');
                            if (pairs.length > 1 && index !== 0) {
                                let { inicia } = pairs[index-1];
                                let query = `SELECT * FROM datos WHERE (inicia BETWEEN "${inicia}" AND "${register.inicia}") AND agente="${agente}" AND idEvento NOT IN (4,300) ORDER BY inicia ASC;`;
                                const result = await this.registerService.getDbQuery(query) as IRegister[];
                                startTime = result[0].inicia;
                                if (result[0].evento === 'loguear') {
                                    // TODO: Avaces al sumarle 1 seg no queda justo despues de "loguear", usar mismo time???
                                    startTime = format(addSeconds(new Date(`${result[0].fecha} ${result[0].inicia}`), 1), 'HH:mm:ss');
                                } else {
                                    // insertart "loguear" y "Conectado"
                                    console.log('no tiene loguear ');
                                }
                            }
                                
                            const inserted = await this.registerService.insertMissingRegister(register, event, startTime);
                        }
                        break;
                    case 1:
                        counter = evento === events[0] ? counter : 0;
                        if (evento !== event) {
                            this.logger.log(LogLevel.ERROR, `Event should be: "${event}" but got "${evento}" instead`);
                            this.logger.log(LogLevel.DEBUG, `Missing pair: ${event} index ${index}`);
                            this.logger.log(LogLevel.DEBUG, `Creating ${event}...`);

                            let { inicia, fecha } = register;
                            let query = `SELECT * FROM datos WHERE agente="${agente}" AND idEvento NOT IN (4,300) AND inicia < "${inicia}" ORDER BY inicia ASC;`;
                            const result = await this.registerService.getDbQuery(query) as IRegister[];
                            let startTime: string;
                            if (result.length > 1) {
                                const referenceLog = result[result.length - 1];
                                startTime = (referenceLog.idEvento == 3)
                                        ? format(subSeconds(new Date(`${referenceLog.fecha} ${referenceLog.inicia}`), 1), 'HH:mm:ss')
                                        : format(addSeconds(new Date(`${referenceLog.fecha} ${referenceLog.inicia}`), 1), 'HH:mm:ss');
                                const inserted = await this.registerService.insertMissingRegister(register, event, startTime);
                            }
                            continue;
                        }
                        this.logger.log(LogLevel.DEBUG, `Event OK!\n`);
                        break;
                }
            }
        }
    }
}