import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsObject,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for updating an existing logical test.
 * All fields are optional — only provided fields are updated.
 * Note: `code` and `questionType` cannot be changed after creation.
 */
export class UpdateTestDto {
  @ApiPropertyOptional({
    description: 'Test duration in minutes',
    example: 25,
    minimum: 1,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Total number of questions in the test',
    example: 44,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalQuestions?: number;

  @ApiPropertyOptional({
    description: 'Number of tutorial questions',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tutorialQuestions?: number;

  @ApiPropertyOptional({
    description:
      'UUID of the linked tutorial test (for main tests that have a tutorial)',
  })
  @IsOptional()
  @IsUUID()
  tutorialTestId?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the test is active and available for assignment',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the test is optional in the candidature workflow',
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Version number of the test',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: 'Flexible metadata for admin-defined properties (JSON object)',
    example: {},
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
