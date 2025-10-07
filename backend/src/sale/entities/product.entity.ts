import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';

export enum SaleStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number | string) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
  price: number;

  @Column({ type: 'int' })
  totalQuantity: number;

  @Column({ type: 'int', default: 0 })
  soldQuantity: number;

  @Column({ type: 'timestamp', nullable: true })
  saleStartAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  saleEndAt: Date;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.UPCOMING,
  })
  status: SaleStatus;

  @OneToMany(() => Order, (order) => order.product)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  getRemainingQuantity(): number {
    return this.totalQuantity - this.soldQuantity;
  }

  isSaleActive(): boolean {
    const now = new Date();
    return (
      this.status === SaleStatus.ACTIVE &&
      this.saleStartAt <= now &&
      (!this.saleEndAt || now <= this.saleEndAt)
    );
  }
}
