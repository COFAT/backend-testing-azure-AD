import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '@shared/dto/pagination.dto';
import { SiteTypeDto } from './create-site.dto';

export class FindSitesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by country',
    example: 'Tunisia',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    enum: SiteTypeDto,
    description: 'Filter by site type',
  })
  @IsOptional()
  @IsEnum(SiteTypeDto)
  siteType?: SiteTypeDto;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by name, code, or country',
    example: 'Tunisia',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
