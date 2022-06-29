"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const server_1 = require("./core/server");
const container_1 = require("./core/container");
const types_1 = require("./core/types");
const logger_interface_1 = require("./interfaces/services/logger.interface");
const port = 3000;
const serverInstace = server_1.server.build();
serverInstace.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    const logger = container_1.container.get(types_1.TYPES.Logger);
    logger.log(logger_interface_1.LoggerLevels.DEBUG, `Server listening in port: ${port}`);
    const database = container_1.container.get(types_1.TYPES.Database);
    yield database.getConnection();
}));
