import { container } from "./core/container";
import { TYPES } from "./core/types";
import { ILogger, LoggerLevels } from "./interfaces/services/logger.interface";

const main = async () => {
  const logger = container.get<ILogger>(TYPES.Logger);
  logger.log(LoggerLevels.DEBUG, "Hello from main.ts!");
  
  const database = container.get<any>(TYPES.Database);
  await database.getConnection();

  logger.log(LoggerLevels.DEBUG, "End program");
};

main();