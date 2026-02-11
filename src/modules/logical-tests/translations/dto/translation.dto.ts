import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// BASE TRANSLATION DTOs
// ============================================================================

/**
 * Translation input for a logical test.
 */
export class LogicalTestTranslationDto {
  @ApiProperty({
    description: 'Language code (e.g., "fr", "en")',
    example: 'fr',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  languageCode: string;

  @ApiProperty({
    description: 'Translated test name',
    example: 'Test D-70',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Translated test description',
    example: 'Test de raisonnement logique avec des dominos',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Translated test instructions shown to candidate',
    example: 'Complétez la séquence de dominos...',
  })
  @IsString()
  @IsNotEmpty()
  instructions: string;
}

/**
 * Translation input for a score classification.
 */
export class ScoreClassificationTranslationDto {
  @ApiProperty({
    description: 'Language code',
    example: 'fr',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  languageCode: string;

  @ApiProperty({
    description: 'Classification label in this language',
    example: 'Très bien',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    description: 'Optional description for this classification',
    example: 'Score supérieur à la moyenne',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Translation input for a logical question.
 */
export class LogicalQuestionTranslationDto {
  @ApiProperty({
    description: 'Language code',
    example: 'fr',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  languageCode: string;

  @ApiPropertyOptional({
    description: 'Optional question title',
    example: 'Question 5',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Question instruction text',
    example: 'Trouvez le domino manquant dans la séquence',
  })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiPropertyOptional({
    description: 'Array of hint texts for the candidate',
    example: ['Suivez la séquence', 'Observez les colonnes'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];
}

/**
 * Translation input for an MCQ proposition.
 */
export class McqPropositionTranslationDto {
  @ApiProperty({
    description: 'Language code',
    example: 'fr',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  languageCode: string;

  @ApiProperty({
    description: 'Proposition text in this language',
    example: 'Tous les chats sont des animaux',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

// ============================================================================
// UPSERT DTOs (for batch create/update translations)
// ============================================================================

/**
 * DTO for upserting translations for a logical test.
 * Accepts an array of translations (one per language).
 */
export class UpsertTestTranslationsDto {
  @ApiProperty({
    description: 'Array of translations (one per language)',
    type: [LogicalTestTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogicalTestTranslationDto)
  translations: LogicalTestTranslationDto[];
}

/**
 * DTO for upserting translations for a score classification.
 */
export class UpsertClassificationTranslationsDto {
  @ApiProperty({
    description: 'Array of translations (one per language)',
    type: [ScoreClassificationTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreClassificationTranslationDto)
  translations: ScoreClassificationTranslationDto[];
}

/**
 * DTO for upserting translations for a logical question.
 */
export class UpsertQuestionTranslationsDto {
  @ApiProperty({
    description: 'Array of translations (one per language)',
    type: [LogicalQuestionTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogicalQuestionTranslationDto)
  translations: LogicalQuestionTranslationDto[];
}

/**
 * DTO for upserting translations for an MCQ proposition.
 */
export class UpsertPropositionTranslationsDto {
  @ApiProperty({
    description: 'Array of translations (one per language)',
    type: [McqPropositionTranslationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => McqPropositionTranslationDto)
  translations: McqPropositionTranslationDto[];
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Language entity returned from API.
 */
export class LanguageResponseDto {
  @ApiProperty({ example: 'fr' })
  code: string;

  @ApiProperty({ example: 'Français' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isDefault: boolean;
}

/**
 * DTO for creating/updating a language.
 */
export class UpsertLanguageDto {
  @ApiProperty({
    description: 'Language code (ISO 639-1)',
    example: 'fr',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @ApiProperty({
    description: 'Human-readable language name',
    example: 'Français',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
