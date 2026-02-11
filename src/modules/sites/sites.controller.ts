import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto, FindSitesQueryDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Sites')
@ApiBearerAuth()
@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Create a new site', description: 'Admin only' })
  @ApiResponse({ status: 201, description: 'Site created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Site name or code already exists' })
  async create(@Body() dto: CreateSiteDto) {
    const site = await this.sitesService.create(dto);
    return {
      success: true,
      data: site,
      message: 'Site created successfully',
    };
  }

  @Get()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get all sites',
    description: 'List sites with pagination and filters',
  })
  @ApiResponse({ status: 200, description: 'Sites retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: FindSitesQueryDto) {
    const result = await this.sitesService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Sites retrieved successfully',
    };
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active sites',
    description: 'List only active sites (for candidates selecting their site)',
  })
  @ApiResponse({ status: 200, description: 'Active sites retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findActive() {
    const sites = await this.sitesService.findActive();
    return {
      success: true,
      data: sites,
      message: 'Active sites retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  @ApiParam({ name: 'id', description: 'Site ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Site retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const site = await this.sitesService.findById(id);
    return {
      success: true,
      data: site,
      message: 'Site retrieved successfully',
    };
  }

  @Get(':id/departments')
  @ApiOperation({
    summary: 'Get departments at a site',
    description: 'Get list of departments available at this site',
  })
  @ApiParam({ name: 'id', description: 'Site ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Departments retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async getDepartments(@Param('id', ParseUUIDPipe) id: string) {
    const departments = await this.sitesService.getDepartments(id);
    return {
      success: true,
      data: departments,
      message: 'Departments retrieved successfully',
    };
  }

  @Put(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update a site', description: 'Admin only' })
  @ApiParam({ name: 'id', description: 'Site ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Site updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiResponse({ status: 409, description: 'Site name or code already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    const site = await this.sitesService.update(id, dto);
    return {
      success: true,
      data: site,
      message: 'Site updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Delete a site', description: 'Admin only' })
  @ApiParam({ name: 'id', description: 'Site ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Site deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete site with users' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.sitesService.delete(id);
    return {
      success: true,
      message: 'Site deleted successfully',
    };
  }
}
