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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Register = void 0;
const typeorm_1 = require("typeorm");
let Register = class Register {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], Register.prototype, "idRegistro", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false, default: () => 'NOW()' }),
    __metadata("design:type", String)
], Register.prototype, "fecha", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', nullable: false, default: '00:00:00' }),
    __metadata("design:type", String)
], Register.prototype, "inicia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false, default: '1000-01-01 00:00:00' }),
    __metadata("design:type", String)
], Register.prototype, "fechaFinal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '00:00:00' }),
    __metadata("design:type", String)
], Register.prototype, "termina", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 12, nullable: false, default: '0000-00-00' }),
    __metadata("design:type", String)
], Register.prototype, "dura", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "ip", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', width: 11, nullable: false, default: '0' }),
    __metadata("design:type", Number)
], Register.prototype, "estacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', width: 11, nullable: false, default: '0' }),
    __metadata("design:type", Number)
], Register.prototype, "idEvento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '0' }),
    __metadata("design:type", String)
], Register.prototype, "evento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "estadoEvento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "Telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "ea", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "agente", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "Password", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "grabacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "servicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "identificador", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '' }),
    __metadata("design:type", String)
], Register.prototype, "idCliente", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false, default: '0000-00-00' }),
    __metadata("design:type", Date)
], Register.prototype, "fechaIng", void 0);
Register = __decorate([
    (0, typeorm_1.Entity)()
], Register);
exports.Register = Register;
