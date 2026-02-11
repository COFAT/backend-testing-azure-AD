import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '@shared/dto/pagination.dto';

/**
 * Query DTO for listing personality tests
 */
export class FindPersonalityTestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query DTO for getting questions with language
 */
export class GetQuestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Question language',
    enum: ['fr', 'en'],
    default: 'fr',
    example: 'fr',
  })
  @IsOptional()
  @IsIn(['fr', 'en'])
  language?: 'fr' | 'en' = 'fr';
}
