import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a job application
 * Used when a candidate submits an application for a position
 */
export class CreateJobApplicationDto {
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
      'Earliest availability date (null means any date / immediately available)',
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

  @ApiPropertyOptional({
    description: 'CV URL (uploaded separately)',
    example: 'https://storage.cofat.com/cvs/user-123.pdf',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cvUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional information',
    example: 'Available for relocation',
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
