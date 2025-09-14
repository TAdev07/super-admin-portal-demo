import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  // Origin used by Shell to validate postMessage and CSP (e.g., http://localhost:5173)
  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  icon: string;

  // Comma-separated scopes allowed for this app (e.g., "users:read,roles:read")
  @Column('simple-array', { nullable: true })
  allowedScopes: string[];

  @Column({ nullable: true })
  remoteEntry: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
