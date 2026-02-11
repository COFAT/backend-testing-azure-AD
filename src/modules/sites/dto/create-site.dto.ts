import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum SiteTypeDto {
  headquarters = 'headquarters',
  research_development = 'research_development',
  production = 'production',
  regional_office = 'regional_office',
}

export class CreateSiteDto {
  @ApiProperty({
    description: 'Site name',
    example: 'COFAT Tunisia',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unique site code',
    example: 'TN-HQ',
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiProperty({
    description: 'Country where the site is located',
    example: 'Tunisia',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({
    description: 'Timezone of the site',
    example: 'Africa/Tunis',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiProperty({
    description: 'Type of site',
    enum: SiteTypeDto,
    example: SiteTypeDto.headquarters,
  })
  @IsEnum(SiteTypeDto)
  siteType: SiteTypeDto;

  @ApiPropertyOptional({
    description: 'Whether the site is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
