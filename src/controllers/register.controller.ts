import { Request } from "express";
import { id, inject } from "inversify";
import { BaseHttpController, controller, httpGet, queryParam, requestParam } from "inversify-express-utils";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
import { IRegister } from "../interfaces/services/register.interface";
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
        
        // Group pairs in  arrays by agent id
        let pairsAgent: { [key: string]: IRegister[] } = {};
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
                    pairsAgent[agente] = [...logsByAgent];
                }
            } else {
                this.logger.log(LogLevel.INFO, `Total registers [${logsByAgent.length}] for agent ${currentIdAgent}`);
                pairsAgent[currentIdAgent] = logsByAgent;
                currentIdAgent = agente;
                this.logger.log(LogLevel.INFO, `Updated currentIdAgent: ${currentIdAgent}`);
                logsByAgent = [register];
                this.logger.log(LogLevel.INFO, `Pushed first register for currentIdAgent: ${currentIdAgent}`);
            }
        });
        this.logger.log(LogLevel.DEBUG, `Grouped pairs logs => `, pairsAgent, true);
    }
}