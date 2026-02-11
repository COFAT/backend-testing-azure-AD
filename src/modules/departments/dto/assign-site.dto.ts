import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AssignSiteDto {
  @ApiProperty({
    description: 'Site ID to assign this department to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  siteId: string;

  @ApiPropertyOptional({
    description: 'Whether the assignment is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
