import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Register {
    /** NOTE: "bigint" column type, used in SQL databases,
     *  doesn't fit into the regular number type and maps
     *  property to a string instead.
     */
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    idRegistro: string;

    @Column( { type: 'datetime', nullable: false }) // default: () => 'NOW()'
    fecha: string;

    @Column({ type: 'time', nullable: false }) // default: '00:00:00'
    inicia: string;

    @Column({ type: 'datetime', nullable: false }) // default: '1000-01-01 00:00:00'
    fechaFinal: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: '00:00:00'
    termina: string;

    @Column({ type: 'varchar', length: 12, nullable: false }) // default: '0000-00-00'
    dura: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    ip: string;

    @Column({ type: 'int', width: 11, nullable: false }) // default: '0'
    estacion: number;

    @Column({ type: 'int', width: 11, nullable: false }) // default: '0'
    idEvento: number;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: '0'
    evento: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    estadoEvento: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    Telefono: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    ea: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    agente: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    Password: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    grabacion: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    servicio: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    identificador: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: ''
    idCliente: string;

    @Column({ type: 'varchar', length: 100, nullable: false }) // default: '0000-00-00'
    fechaIng: Date;
}