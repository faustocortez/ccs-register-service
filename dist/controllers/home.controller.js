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
exports.HomeController = void 0;
const inversify_express_utils_1 = require("inversify-express-utils");
const database_1 = require("../database");
// import Database from "../database/index";
let HomeController = class HomeController {
    index(req, res) {
        return res.send("Hello world");
    }
    getRegisters(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // const db = new Database();
            // const conn = await db.getConnection();
            const conn = yield (0, database_1.connect)();
            const registers = yield conn.query('SELECT * FROM calls.register7874 limit 10;');
            return res.json({ registers });
        });
    }
};
__decorate([
    (0, inversify_express_utils_1.httpGet)(""),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HomeController.prototype, "index", null);
__decorate([
    (0, inversify_express_utils_1.httpGet)("register"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "getRegisters", null);
HomeController = __decorate([
    (0, inversify_express_utils_1.controller)("/")
], HomeController);
exports.HomeController = HomeController;
