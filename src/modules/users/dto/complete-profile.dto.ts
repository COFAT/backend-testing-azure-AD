import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum GenderDto {
  Male = 'Male',
  Female = 'Female',
}

/**
 * DTO for completing candidate profile after OTP verification
 * This endpoint does TWO things:
 * 1. Updates User profile (gender, dateOfBirth, phone)
 * 2. Creates a JobApplication (siteId, departmentId, desiredPosition, etc.)
 *
 * Status changes from pending_profile -> active
 */
export class CompleteProfileDto {
  // ============================================================================
  // USER PROFILE FIELDS (stored in User table)
  // ============================================================================

  @ApiProperty({
    enum: GenderDto,
    description: 'Gender',
    example: GenderDto.Male,
  })
  @IsEnum(GenderDto)
  gender: GenderDto;

  @ApiProperty({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1995-06-15',
  })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+216 71 123 456',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // ============================================================================
  // JOB APPLICATION FIELDS (stored in JobApplication table)
  // ============================================================================

  @ApiProperty({
    description: 'Site ID where the candidate wants to work',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Target department ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  departmentId: string;

  @ApiProperty({
    description: 'Target position (what job they are applying for)',
    example: 'Web Developer',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  targetPosition: string;

  @ApiPropertyOptional({
    description: 'Current position/job status',
    example: 'Junior Developer at XYZ Company',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentPosition?: string;

  @ApiPropertyOptional({
    description: 'Education level',
    example: "Bachelor's Degree in Computer Science",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  educationLevel?: string;

  @ApiPropertyOptional({
    description:
      'Earliest availability date (null means any date / immediately)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  availability?: string;

  @ApiPropertyOptional({
    description: 'Motivation letter / cover letter',
    example: 'I am passionate about...',
  })
  @IsOptional()
  @IsString()
  motivation?: string;
}
