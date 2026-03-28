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

  @Column({ type: 'text', nullable: true })
  imageBase64: string; // The base64 or URL of the uploaded image

  @Column({ nullable: true })
  calibrationLine: string; // Deprecated, keeping just in case

  @Column({ type: 'float', nullable: true })
  calibrationLengthMm: number;

  @Column({ type: 'float', default: 1 })
  imageScale: number;

  @Column({ type: 'float', default: 0 })
  imageOffsetX: number;

  @Column({ type: 'float', default: 0 })
  imageOffsetY: number;

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
