import { container } from "./core/container";
import { TYPES } from "./core/types";
import { ILogger, LoggerLevels } from "./interfaces/services/logger.interface";

const main = () => {
  const logger = container.get<ILogger>(TYPES.Logger);

  logger.log(LoggerLevels.DEBUG, "Hello from main.ts!");
};

main();