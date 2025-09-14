import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateAppDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Code must contain only letters, numbers, hyphens, and underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
