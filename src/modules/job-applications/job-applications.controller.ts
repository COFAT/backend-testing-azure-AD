import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JobApplicationsService } from './job-applications.service';
import {
  CreateJobApplicationDto,
  ReviewJobApplicationDto,
  FindJobApplicationsQueryDto,
} from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Job Applications')
@ApiBearerAuth()
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  /**
   * Create a new job application (candidate only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('candidate')
  @ApiOperation({ summary: 'Create a new job application' })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Duplicate application' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJobApplicationDto,
  ) {
    return this.jobApplicationsService.create(user.sub, dto);
  }

  /**
   * Get all job applications (admin/psychologue only)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'psychologue')
  @ApiOperation({ summary: 'Get all job applications with filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of applications',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin/psychologue role',
  })
  async findAll(@Query() query: FindJobApplicationsQueryDto) {
    return this.jobApplicationsService.findAll(query);
  }

  /**
   * Get current candidate's applications
   */
  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('candidate')
  @ApiOperation({ summary: "Get current candidate's job applications" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of candidate's applications",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyApplications(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindJobApplicationsQueryDto,
  ) {
    return this.jobApplicationsService.findByCandidate(user.sub, query);
  }

  /**
   * Get application statistics (admin/psychologue only)
   */
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'psychologue')
  @ApiOperation({ summary: 'Get job application statistics' })
  @ApiResponse({
    status: 200,
    description: 'Application statistics',
  })
  async getStatistics(
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.jobApplicationsService.getStatistics(siteId, departmentId);
  }

  /**
   * Get a single job application by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a job application by ID' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Application details',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobApplicationsService.findOne(id, user.sub, user.role);
  }

  /**
   * Review (approve/reject) a job application (admin/psychologue only)
   */
  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'psychologue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review (approve/reject) a job application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Application reviewed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid review or already processed',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReviewJobApplicationDto,
  ) {
    return this.jobApplicationsService.review(id, user.sub, dto);
  }

  /**
   * Withdraw an application (candidate only - own applications)
   */
  @Post(':id/withdraw')
  @UseGuards(RolesGuard)
  @Roles('candidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a job application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Application withdrawn successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot withdraw non-pending application',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only withdraw own applications',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobApplicationsService.withdraw(id, user.sub);
  }
}
