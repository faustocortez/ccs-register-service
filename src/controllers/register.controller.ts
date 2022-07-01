import { inject } from "inversify";
import { Request, Response } from "express";
import { BaseHttpController, controller, httpGet, queryParam } from "inversify-express-utils";
import { TYPES } from "../core/types";
import RegisterService from "../services/register.service";

@controller("/register")
export class RegisterController extends BaseHttpController {

    public constructor(@inject(TYPES.RegisterService) private registerService: RegisterService) {
        super();
    }
  
    @httpGet("")
    public async index(req: Request) {
        const params = { ...req.query };
        const registers = await this.registerService.getRegisters(params);
        return this.json({ registers });
    }

    @httpGet("/filter")
    public async byFilters(@queryParam('q') q: string) {
        const filter = q;
        console.log('c')
        const registers = await this.registerService.getRegistersByFilter(filter);
        return this.json({ registers });
    }
}