import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationQueryDto } from '@shared/dto/pagination.dto';
import { UserRoleDto, UserStatusDto } from '@shared/dto/enums.dto';

/**
 * Query DTO for listing users
 */
export class FindUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: UserRoleDto,
    description: 'Filter by user role',
    example: UserRoleDto.candidate,
  })
  @IsOptional()
  @IsEnum(UserRoleDto)
  role?: UserRoleDto;

  @ApiPropertyOptional({
    enum: UserStatusDto,
    description: 'Filter by user status',
    example: UserStatusDto.active,
  })
  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
