import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  @Column()
  action: string; // e.g., users.create

  @Column({ type: 'text', nullable: true })
  targetType: string | null;

  @Column({ type: 'text', nullable: true })
  targetId: string | null;

  @Column({ type: 'text', nullable: true })
  payload: string | null; // JSON string

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @Column({ type: 'text', nullable: true })
  cid: string | null; // correlation id

  @CreateDateColumn()
  createdAt: Date;
}
