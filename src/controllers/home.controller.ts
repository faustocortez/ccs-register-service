import { Request, Response } from "express";
import { controller, httpGet } from "inversify-express-utils";
import { connect } from "../database";
// import Database from "../database/index";

@controller("/")
export class HomeController {
  @httpGet("")
  public index(req: Request, res: Response) {
    return res.send("Hello world");
  }

  @httpGet("register")
  public async getRegisters(req: Request, res: Response) {
    // const db = new Database();
    // const conn = await db.getConnection();
    const conn = await connect();
    const registers = await conn.query('SELECT * FROM calls.register7874 limit 10;')
    return res.json({ registers });
  }
}