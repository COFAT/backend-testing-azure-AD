import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a score classification (with translation).
 */
export class ScoreClassificationResponseDto {
  @ApiProperty({ description: 'Classification UUID' })
  id: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  displayOrder: number;

  @ApiProperty({ description: 'Minimum score', example: 0 })
  minScore: number;

  @ApiProperty({ description: 'Maximum score', example: 10 })
  maxScore: number;

  @ApiPropertyOptional({
    description: 'Color code for UI display',
    example: '#28a745',
  })
  colorCode?: string | null;

  @ApiPropertyOptional({
    description: 'Translated label',
    example: 'Très bien',
  })
  label?: string;

  @ApiPropertyOptional({
    description: 'Translated description',
    example: 'Score supérieur à la moyenne',
  })
  description?: string;
}

/**
 * Response DTO for a logical test (with translations applied).
 */
export class TestResponseDto {
  @ApiProperty({ description: 'Test UUID' })
  id: string;

  @ApiProperty({
    description: 'Test code',
    enum: ['D_70', 'D_2000', 'LOGIQUE_PROPOSITIONS'],
    example: 'D_70',
  })
  code: string;

  @ApiProperty({
    description: 'Question type',
    enum: ['DOMINO', 'MCQ'],
    example: 'DOMINO',
  })
  questionType: string;

  @ApiProperty({ description: 'Duration in minutes', example: 25 })
  durationMinutes: number;

  @ApiProperty({ description: 'Total questions', example: 44 })
  totalQuestions: number;

  @ApiProperty({ description: 'Tutorial questions count', example: 4 })
  tutorialQuestions: number;

  @ApiProperty({ description: 'Whether this is a tutorial test' })
  isTutorial: boolean;

  @ApiPropertyOptional({ description: 'Linked tutorial test ID' })
  tutorialTestId?: string | null;

  @ApiProperty({ description: 'Whether the test is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether the test is optional' })
  isOptional: boolean;

  @ApiProperty({ description: 'Version number' })
  version: number;

  @ApiPropertyOptional({
    description: 'Metadata (admin-defined properties)',
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Translated test name',
    example: 'Test D-70',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Translated description',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Translated instructions',
  })
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Language code used for the returned translation',
    example: 'fr',
  })
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Score classifications (when included)',
    type: [ScoreClassificationResponseDto],
  })
  classifications?: ScoreClassificationResponseDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Response DTO for paginated test list.
 */
export class TestListResponseDto {
  @ApiProperty({ type: [TestResponseDto] })
  data: TestResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: { page: 1, limit: 20, total: 3, totalPages: 1 },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
