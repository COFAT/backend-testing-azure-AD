import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/dto/pagination.dto';
import { ReportLanguageDto } from '@shared/dto/enums.dto';

/**
 * Query DTO for listing reports
 */
export class FindReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by candidature ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  candidatureId?: string;

  @ApiPropertyOptional({
    enum: ReportLanguageDto,
    description: 'Filter by report language',
    example: ReportLanguageDto.fr,
  })
  @IsOptional()
  @IsEnum(ReportLanguageDto)
  language?: ReportLanguageDto;
}
