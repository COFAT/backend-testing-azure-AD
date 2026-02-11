import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ApplicationStatusFilter {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  withdrawn = 'withdrawn',
}

/**
 * DTO for filtering and paginating job applications list
 */
export class FindJobApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ApplicationStatusFilter,
    example: ApplicationStatusFilter.pending,
  })
  @IsOptional()
  @IsEnum(ApplicationStatusFilter)
  status?: ApplicationStatusFilter;

  @ApiPropertyOptional({
    description: 'Filter by site ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by candidate ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
