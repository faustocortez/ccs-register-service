import { inject } from "inversify";
import { BaseHttpController, controller, httpGet } from "inversify-express-utils";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
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
        await this.registerService.insertMissingRegisters('datos');
    }
}