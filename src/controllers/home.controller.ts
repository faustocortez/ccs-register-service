import { Request, Response } from "express";
import { controller, httpGet } from "inversify-express-utils";

@controller("/")
export class HomeController {
  @httpGet("")
  public index(req: Request, res: Response) {
    return res.send("Bazinga!");
  }
}