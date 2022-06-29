"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const inversify_1 = require("inversify");
const types_1 = require("./types");
const database_1 = __importDefault(require("../database"));
const logger_service_1 = __importDefault(require("../services/logger.service"));
// controllers
require("../controllers/home.controller");
exports.container = new inversify_1.Container();
exports.container.bind(types_1.TYPES.Logger).to(logger_service_1.default);
exports.container.bind(types_1.TYPES.Database).to(database_1.default);
