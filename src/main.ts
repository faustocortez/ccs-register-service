import "reflect-metadata";
import { server } from "./core/server";
import { container } from "./core/container";
import { TYPES } from "./core/types";
import { ILogger, LoggerLevels } from "./interfaces/services/logger.interface";

const port = 3000;

const serverInstace = server.build();
serverInstace.listen(port, async () => {
  const logger = container.get<ILogger>(TYPES.Logger);
  logger.log(LoggerLevels.DEBUG, `Server listening in port: ${ port }`);
});