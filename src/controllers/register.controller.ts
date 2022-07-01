import { Request } from "express";
import { id, inject } from "inversify";
import { BaseHttpController, controller, httpGet, queryParam, requestParam } from "inversify-express-utils";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
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

    @httpGet("/:agente/logs")
    public async addMissingLog(
        @requestParam('agente') agente: string,
        @queryParam('fecha') fecha: string,
        @queryParam('idEvento') idEvento: string
    ) {
        const eventos: number[] = (idEvento.split(',')).map(e => Number(e));
        const params = { agente, fecha, idEvento: eventos };
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => addMissingLog`, params);
        const registers = await this.registerService.getRegistersByParams(params);
        // Validate if there missing logs
        if (registers.length % 2 === 0) {
            this.logger.log(LogLevel.INFO, `"Agente" with id: ${ agente }, has the logs completed...`);
        } else {
            // Check which log is missing (Conectado [ID: 4] | Desconectado [ID: 300])
            this.logger.log(LogLevel.INFO, `"Agente" with id: ${ agente }, has inconsistency with the logs ${registers.length}`);
            let events = {
                0: 'Conectado',
                1: 'Desconectado'
            };
            let counter = 0;
            let referece = [];
            for (let index = 0; index < registers.length; index++) {
                const { evento } = registers[index];
                this.logger.log(LogLevel.DEBUG, `\nITERATION ${index}`, { counter, evento });
                const event = events[counter]

                switch (counter) {
                    case 0:
                        counter++;
                        if (evento === event) {
                            this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                            continue;
                        } else {
                            this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                            referece.push(registers[index]);
                        }
                        break;
                    case 1:
                        counter++;
                        if (evento === event) {
                            this.logger.log(LogLevel.INFO, `counter = ${counter} go to next iteration ${((index + 1) + 1)}`);
                            continue;
                        } else {
                            this.logger.log(LogLevel.ERROR, `event should be: "${event}" but got "${evento}" instead`);
                            referece.push(registers[index]);
                        }
                        break;
                }
            };

            // const { evento } = registers[missingLogPosition];
            // this.logger.log(LogLevel.INFO, `Register.evento: ${ evento }`);
            // return this.json({ register })
            
        }
        return this.json({ registers });
    }
}