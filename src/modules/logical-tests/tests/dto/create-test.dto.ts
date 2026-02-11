import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
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
 * DTO for creating a new logical test.
 */
export class CreateTestDto {
  @ApiProperty({
    description: 'Test code identifier',
    enum: ['D_70', 'D_2000', 'LOGIQUE_PROPOSITIONS'],
    example: 'D_70',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['D_70', 'D_2000', 'LOGIQUE_PROPOSITIONS'])
  code: string;

  @ApiProperty({
    description: 'Question type used in this test',
    enum: ['DOMINO', 'MCQ'],
    example: 'DOMINO',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['DOMINO', 'MCQ'])
  questionType: string;

  @ApiProperty({
    description: 'Test duration in minutes',
    example: 25,
    minimum: 1,
    maximum: 180,
  })
  @IsInt()
  @Min(1)
  @Max(180)
  durationMinutes: number;

  @ApiProperty({
    description: 'Total number of questions in the test',
    example: 44,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  totalQuestions: number;

  @ApiPropertyOptional({
    description: 'Number of tutorial questions (0 if no tutorial)',
    example: 4,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tutorialQuestions?: number;

  @ApiPropertyOptional({
    description: 'Whether this test is a tutorial test',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTutorial?: boolean;

  @ApiPropertyOptional({
    description:
      'UUID of the linked tutorial test (for main tests that have a tutorial)',
  })
  @IsOptional()
  @IsUUID()
  tutorialTestId?: string;

  @ApiPropertyOptional({
    description: 'Whether the test is active and available for assignment',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the test is optional in the candidature workflow',
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
    description:
      'Translations for the test (at least one, usually default language)',
    type: [LogicalTestTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogicalTestTranslationDto)
  translations: LogicalTestTranslationDto[];
}
