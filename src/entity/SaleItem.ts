import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SaleEvent } from './SaleEvent';

@Entity()
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  itemId!: string;

  @Column('int')
  cost!: number;

  @Column('float')
  taxRate!: number;

  @ManyToOne(() => SaleEvent, saleEvent => saleEvent.items)
  saleEvent!: SaleEvent;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}