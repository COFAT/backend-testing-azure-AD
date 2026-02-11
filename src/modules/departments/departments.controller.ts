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
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  FindDepartmentsQueryDto,
  AssignSiteDto,
} from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Create a new department',
    description: 'Admin only',
  })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  async create(@Body() dto: CreateDepartmentDto) {
    const department = await this.departmentsService.create(dto);
    return {
      success: true,
      data: department,
      message: 'Department created successfully',
    };
  }

  @Get()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get all departments',
    description: 'List departments with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Departments retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: FindDepartmentsQueryDto) {
    const result = await this.departmentsService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Departments retrieved successfully',
    };
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active departments',
    description: 'List only active departments',
  })
  @ApiResponse({ status: 200, description: 'Active departments retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findActive() {
    const departments = await this.departmentsService.findActive();
    return {
      success: true,
      data: departments,
      message: 'Active departments retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Department retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const department = await this.departmentsService.findById(id);
    return {
      success: true,
      data: department,
      message: 'Department retrieved successfully',
    };
  }

  @Get(':id/sites')
  @ApiOperation({
    summary: 'Get sites for a department',
    description: 'Get list of sites where this department is available',
  })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Sites retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async getSites(@Param('id', ParseUUIDPipe) id: string) {
    const sites = await this.departmentsService.getSites(id);
    return {
      success: true,
      data: sites,
      message: 'Sites retrieved successfully',
    };
  }

  @Post(':id/sites')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Assign department to a site',
    description: 'Admin only - Link department to a site',
  })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Department assigned to site' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Department or site not found' })
  @ApiResponse({ status: 409, description: 'Already assigned' })
  async assignToSite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSiteDto,
  ) {
    const result = await this.departmentsService.assignToSite(id, dto);
    return {
      success: true,
      data: result,
      message: 'Department assigned to site successfully',
    };
  }

  @Delete(':id/sites/:siteId')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Remove department from a site',
    description: 'Admin only - Unlink department from a site',
  })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiParam({ name: 'siteId', description: 'Site ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Department removed from site' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Association not found' })
  async removeFromSite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('siteId', ParseUUIDPipe) siteId: string,
  ) {
    await this.departmentsService.removeFromSite(id, siteId);
    return {
      success: true,
      message: 'Department removed from site successfully',
    };
  }

  @Put(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update a department', description: 'Admin only' })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentsService.update(id, dto);
    return {
      success: true,
      data: department,
      message: 'Department updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Delete a department', description: 'Admin only' })
  @ApiParam({ name: 'id', description: 'Department ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Department deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete department linked to sites',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.departmentsService.delete(id);
    return {
      success: true,
      message: 'Department deleted successfully',
    };
  }
}
