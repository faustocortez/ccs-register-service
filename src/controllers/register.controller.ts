import { inject } from "inversify";
import { BaseHttpController, controller, httpPost, requestBody } from "inversify-express-utils";
import format from "date-fns/format";
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/services/logger.interface";
import Logger from "../services/logger.service";
import RegisterService from "../services/register.service";
import { IRegisterController, IRegisterControllerResponse } from "../interfaces/services/register.interface";

@controller("/service/v1")
export class RegisterController extends BaseHttpController implements IRegisterController {

    private table: string = 'registros';

    public constructor(
        @inject(TYPES.RegisterService) private registerService: RegisterService,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        super();
    }

    @httpPost("/registers")
    public async insertMissingEventRegisters(@requestBody() body: { date: string}) {
        let response: IRegisterControllerResponse;
        this.logger.log(LogLevel.DEBUG, `Executing ${this.constructor.name} => insertMissingEventRegisters()`);
        if (body?.date) {
            const month = format(new Date(body.date), 'yyyyMM');
            const tableName = `${this.table}${month}`
            this.logger.log(LogLevel.INFO, `Making query to table "${tableName}" with date "${body.date}"`);
            await this.registerService.insertMissingRegisters(tableName, body.date);
        } else {
            this.logger.log(LogLevel.ERROR, `Bad Request: invalid body input`);
            response.message = `Invalid body input`
            return this.json(response, 400)
        }
    }
}