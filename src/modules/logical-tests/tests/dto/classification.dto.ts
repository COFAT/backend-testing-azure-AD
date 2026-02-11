import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScoreClassificationTranslationDto } from '../../translations/dto';

/**
 * DTO for a single score classification entry within a batch upsert.
 */
export class ScoreClassificationItemDto {
  @ApiPropertyOptional({
    description: 'Existing classification ID (omit for new classifications)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Display order (1-based, used for sorting in the UI)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  displayOrder: number;

  @ApiProperty({
    description: 'Minimum score for this classification (inclusive)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  minScore: number;

  @ApiProperty({
    description: 'Maximum score for this classification (inclusive)',
    example: 10,
  })
  @IsInt()
  @Min(0)
  maxScore: number;

  @ApiPropertyOptional({
    description: 'Color code for UI display (hex or named)',
    example: '#28a745',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorCode?: string;

  @ApiProperty({
    description: 'Translations for this classification (at least one)',
    type: [ScoreClassificationTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreClassificationTranslationDto)
  translations: ScoreClassificationTranslationDto[];
}

/**
 * DTO for upserting all score classifications for a test.
 * Replaces the entire classification set in a single transaction.
 */
export class UpsertClassificationsDto {
  @ApiProperty({
    description:
      'Array of score classifications. Existing classifications not in this array will be deleted.',
    type: [ScoreClassificationItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreClassificationItemDto)
  classifications: ScoreClassificationItemDto[];
}
