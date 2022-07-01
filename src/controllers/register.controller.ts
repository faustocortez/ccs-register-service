import { inject } from "inversify";
import { Request, Response } from "express";
import { controller, httpGet } from "inversify-express-utils";
import { TYPES } from "../core/types";
import RegisterService from "../services/register.service";

@controller("/register")
export class RegisterController {

    public constructor(@inject(TYPES.RegisterService) private registerService: RegisterService) {}
  
    @httpGet("")
    public async index(req: Request, res: Response) {
        const registers = await this.registerService.getRegisters();
        return res.json({ registers });
    }

    @httpGet("/h")
    public home(req: Request, res: Response) {
      return res.send("Bazinga!");
    }
}