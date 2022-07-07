import "reflect-metadata";
import { server } from "./core/server";
import { container } from "./core/container";
import { TYPES } from "./core/types";
import { ILogger, LogLevel } from "./interfaces/logger.interface";
import Database from "./database";

const port = process.env.PORT || 3000;
const serverInstace = server.build();

serverInstace.listen(port, async () => {
  const logger = container.get<ILogger>(TYPES.Logger);
  const db = container.get<Database>(TYPES.Database);
  await db.getConnection();
  
  logger.log(LogLevel.DEBUG, `Server listening in port: ${ port }`);
});