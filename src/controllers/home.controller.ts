import { Request, Response } from "express";
import { controller, httpGet } from "inversify-express-utils";
import { connect } from "../database";

@controller("/")
export class HomeController {
  @httpGet("")
  public index(req: Request, res: Response) {
    return res.send("Hello world");
  }

  @httpGet("register")
  public async getRegisters(req: Request, res: Response) {
    const conn = await connect();
    const [registers] = await conn.query(
      'select * from calls.register where agente=? limit 2;',
      [7874]
    )
    return res.json({ registers });
  }
}