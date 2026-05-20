import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DiagnosisStatus } from '../enums/diagnosis-status.enum';
import { Material } from './material.entity';
import { DiagnosisConfig } from './diagnosis-config.entity';

@Entity('diagnosis_tasks')
export class DiagnosisTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'advertiser_id', type: 'varchar', length: 50 })
  @Index()
  advertiserId: string;

  @Column({ name: 'video_id', type: 'varchar', length: 50 })
  @Index()
  videoId: string;

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'video_id', referencedColumnName: 'videoId' })
  material: Material;

  @Column({ name: 'config_id', type: 'uuid', nullable: true })
  configId: string;

  @ManyToOne(() => DiagnosisConfig, { nullable: true })
  @JoinColumn({ name: 'config_id' })
  config: DiagnosisConfig;

  @Column({ name: 'ocean_task_id', type: 'varchar', length: 100, nullable: true })
  @Index()
  oceanTaskId: string;

  @Column({
    type: 'enum',
    enum: DiagnosisStatus,
    default: DiagnosisStatus.PENDING,
  })
  @Index()
  status: DiagnosisStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}
