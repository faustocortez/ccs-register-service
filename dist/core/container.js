"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const inversify_1 = require("inversify");
const logger_service_1 = __importDefault(require("../services/logger.service"));
const types_1 = require("./types");
exports.container = new inversify_1.Container();
exports.container.bind(types_1.TYPES.Logger).to(logger_service_1.default);
