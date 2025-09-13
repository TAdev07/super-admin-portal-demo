import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayUnique,
  IsArray,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes: string[] = [];
}
