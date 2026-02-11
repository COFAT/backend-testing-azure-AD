import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogicalTestTranslationDto } from '../../translations/dto';

/**
 * DTO for creating a tutorial logical test linked to a main test.
 * Code and questionType are derived from the main test.
 */
export class CreateTutorialTestDto {
  @ApiPropertyOptional({
    description:
      'Tutorial duration in minutes (defaults to main test duration)',
    example: 10,
    minimum: 1,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Total number of questions (defaults to main test total)',
    example: 8,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalQuestions?: number;

  @ApiPropertyOptional({
    description: 'Whether the tutorial test is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the tutorial test is optional',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Flexible metadata for admin-defined properties (JSON object)',
    example: {},
    default: {},
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Translations for the tutorial test (at least one language)',
    type: [LogicalTestTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogicalTestTranslationDto)
  translations: LogicalTestTranslationDto[];
}
