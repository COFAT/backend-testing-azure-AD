import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum UserRoleDto {
  admin = 'admin',
  psychologue = 'psychologue',
  candidate = 'candidate',
}

/**
 * DTO for admin creating a new user
 * Generates a memorable temporary password
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Email address',
    example: 'psychologue@cofat.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'First name',
    example: 'Marie',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Dupont',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    enum: UserRoleDto,
    description: 'User role',
    example: UserRoleDto.psychologue,
  })
  @IsEnum(UserRoleDto)
  role: UserRoleDto;

  @ApiPropertyOptional({
    description: 'Site ID to assign user to',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+216 71 123 456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Send credentials email to user',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
