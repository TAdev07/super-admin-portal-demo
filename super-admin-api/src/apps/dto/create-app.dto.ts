import { IsString, IsOptional } from 'class-validator';

export class CreateAppDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
