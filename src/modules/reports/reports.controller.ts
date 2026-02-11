import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportLanguage, UserRole } from '@prisma/client';
import { FindReportsQueryDto } from './dto/reports.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get all reports',
    description: 'List reports with pagination and filters',
  })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  async findAll(@Query() query: FindReportsQueryDto) {
    const result = await this.reportsService.findAll({
      page: query.page,
      limit: query.limit,
      candidatureId: query.candidatureId,
      language: query.language as ReportLanguage | undefined,
    });
    return {
      success: true,
      data: result,
      message: 'Reports retrieved successfully',
    };
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get report by ID',
    description: 'Retrieve a specific report by its ID',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async findById(@Param('id') id: string) {
    const report = await this.reportsService.findById(id);
    return {
      success: true,
      data: report,
      message: 'Report retrieved successfully',
    };
  }
}
