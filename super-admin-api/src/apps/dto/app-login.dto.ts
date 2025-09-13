import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
} from 'class-validator';

export class AppLoginDto {
  @IsString()
  @IsNotEmpty()
  appName: string; // registered app name

  @IsString()
  @IsNotEmpty()
  origin: string; // runtime origin of requesting app

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requestedScopes: string[];

  @IsOptional()
  @IsString()
  userEmail?: string; // optional explicit user (else derive from auth context later)
}
