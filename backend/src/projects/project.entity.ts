import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Store polygon coordinates as JSON string
  @Column({ type: 'text', nullable: true })
  polygonPoints: string; 

  @Column({ nullable: true })
  imageBase64: string; // The base64 or URL of the uploaded image

  @Column({ nullable: true })
  calibrationLine: string; // JSON string for scale line coordinates

  @Column({ type: 'float', nullable: true })
  calibrationLengthMm: number;

  @Column({ nullable: true })
  cellModelId: number;

  @Column({ default: false })
  useHolders: boolean;

  @Column({ type: 'int', nullable: true })
  seriesVoltage: number;

  @Column({ type: 'int', nullable: true })
  parallelCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
