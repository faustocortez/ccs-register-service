import { inject } from "inversify";
import { BaseHttpController, controller, httpGet, queryParam } from "inversify-express-utils";
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
}