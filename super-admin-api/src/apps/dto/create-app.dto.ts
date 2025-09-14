import { IsString, IsOptional, Matches, IsArray } from 'class-validator';

export class CreateAppDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message:
      'Code must contain only letters, numbers, hyphens, and underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  icon?: string;

  // Origin used for origin validation when issuing app tokens
  @IsOptional()
  @IsString()
  origin?: string;

  // List of scopes this app is allowed to request (will be intersected with user scopes)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedScopes?: string[];

  // Path to remoteEntry served by API static server (e.g., /bundles/<code>/remoteEntry.js)
  @IsOptional()
  @IsString()
  remoteEntry?: string;
}
