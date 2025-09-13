import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  url: string;

  // Origin used by Shell to validate postMessage and CSP (e.g., http://localhost:5173)
  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  icon: string;

  // Comma-separated scopes allowed for this app (e.g., "users:read,roles:read")
  @Column({ type: 'simple-array', nullable: true })
  allowedScopes: string[];
}
