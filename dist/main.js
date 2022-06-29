"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const container_1 = require("./core/container");
const types_1 = require("./core/types");
const logger_interface_1 = require("./interfaces/services/logger.interface");
const main = () => {
    const logger = container_1.container.get(types_1.TYPES.Logger);
    logger.log(logger_interface_1.LoggerLevels.DEBUG, "Hello from main.ts!");
};
main();
