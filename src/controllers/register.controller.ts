import { inject } from "inversify";
import { BaseHttpController, controller, httpPost, requestBody } from "inversify-express-utils";
import format from "date-fns/format";
import dotenv from 'dotenv';
import { TYPES } from "../core/types";
import { LogLevel } from "../interfaces/logger.interface";
import Logger from "../services/logger.service";
import RegisterService from "../services/register.service";
import { IRegisterController, IRegisterControllerResponse } from "../interfaces/register.interface";

dotenv.config();

@controller("/service/v1")
export class RegisterController extends BaseHttpController implements IRegisterController {

    private table: string = process.env.DB_TABLE_NAME;

    private database: string = process.env.DB_NAME;

    public constructor(
        @inject(TYPES.RegisterService) private registerService: RegisterService,
        @inject(TYPES.Logger) private logger: Logger
    ) {
        super();
    }

    @httpPost("/registers")
    public async insertMissingEventRegisters(@requestBody() body: { date: string}) {
        const response: IRegisterControllerResponse = { data: [], message: '' };
        let statusCode: number = 200;
        this.logger.log(LogLevel.INFO, `### INSERT MISSING REGISTERS SERVICE ###`);
        if (body?.date) {
            const month = format(new Date(`${body.date} 06:00:00`), 'yyyyMM');
            const tableName = `${this.database}.${this.table}${month}`;
            const insertedRegisters = await this.registerService.insertMissingRegisters(tableName, body.date);
            this.logger.log(LogLevel.INFO, `Missing registers found and inserted [${insertedRegisters.length}] => `, { insertedRegisters });
            response.data = insertedRegisters;
            response.message = `Registers inserted: [${insertedRegisters.length}]`;
        } else {
            this.logger.log(LogLevel.ERROR, `Bad Request: invalid body input`);
            response.message = `Invalid body input`;
            statusCode = 400;
        }
        return this.json(response, statusCode);
    }
}