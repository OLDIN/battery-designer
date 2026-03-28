import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cells')
export class Cell {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ default: '18650' })
  formFactor: string;

  @Column({ type: 'int' })
  capacity: number; // in mAh

  @Column({ type: 'float' })
  maxDischarge: number; // in Amps

  @Column({ type: 'float' })
  weight: number; // in grams

  @Column({ type: 'float', default: 18 })
  diameter: number; // in mm

  @Column({ type: 'float', default: 65 })
  length: number; // in mm
}
