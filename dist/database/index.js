"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Database_1;
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const typeorm_1 = require("typeorm");
const register_entity_1 = require("../entities/register.entity");
const types_1 = require("../core/types");
const logger_service_1 = __importDefault(require("../services/logger.service"));
const logger_interface_1 = require("../interfaces/services/logger.interface");
// TODO: Make it ormconfig.json or env
const MysqlDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "root",
    database: "calls",
    entities: [register_entity_1.Register],
    synchronize: true
});
let Database = Database_1 = class Database {
    constructor(logger) {
        this.logger = logger;
    }
    getConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(logger_interface_1.LoggerLevels.DEBUG, `Getting DataSource connection...`);
            if (Database_1.connection instanceof typeorm_1.DataSource)
                return Database_1.connection;
            try {
                Database_1.connection = yield MysqlDataSource.initialize();
            }
            catch (error) {
                this.logger.log(logger_interface_1.LoggerLevels.DEBUG, 'Cannot establish database connection');
                this.logger.log(logger_interface_1.LoggerLevels.ERROR, error);
            }
            this.logger.log(logger_interface_1.LoggerLevels.DEBUG, `Connection established`);
            return Database_1.connection;
        });
    }
};
Database = Database_1 = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [logger_service_1.default])
], Database);
exports.default = Database;
