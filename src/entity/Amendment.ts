import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['invoiceId', 'itemId', 'date'])
export class Amendment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column()
  invoiceId!: string;

  @Column()
  itemId!: string;

  @Column('int')
  cost!: number;

  @Column('float')
  taxRate!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}