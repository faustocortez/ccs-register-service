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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const promise_1 = require("mysql2/promise");
const logger_interface_1 = require("../interfaces/services/logger.interface");
dotenv_1.default.config();
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(logger_interface_1.LoggerLevels.DEBUG, `Getting DataSource connection...`);
        const connection = yield (0, promise_1.createPool)({
            host: 'localhost',
            user: 'root',
            password: 'mysqlserver!!',
            database: 'calls',
            connectionLimit: 10
        });
        console.log(logger_interface_1.LoggerLevels.DEBUG, `connected`);
        return connection;
    });
}
exports.connect = connect;
// @injectable()
// class Database {
//     private static connection: Pool;
//     public async getConnection(): Promise<Pool> {
//         // this.logger.log(LoggerLevels.DEBUG, `Getting DataSource connection...`);
//         if (Database.connection instanceof Database) return Database.connection;
//         try {
//             Database.connection = await createPool({
//                 host: process.env.HOST,
//                 user: process.env.USER,
//                 password: process.env.PASSWORD,
//                 database: process.env.DATABASE,
//                 connectionLimit: Number(process.env.CONNECTION_LIMIT)
//             });
//         } catch (error) {
//             // this.logger.log(LoggerLevels.DEBUG, 'Cannot establish database connection');
//             // this.logger.log(LoggerLevels.ERROR, error);
//         }
//         // this.logger.log(LoggerLevels.DEBUG, `Connection established`);
//         return Database.connection;
//     }
// }
// export default Database;
