import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SaleItem } from './SaleItem';

@Entity()
export class SaleEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column()
  invoiceId!: string;

  @OneToMany(() => SaleItem, item => item.saleEvent, { 
    cascade: true, 
    eager: true 
  })
  items!: SaleItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}