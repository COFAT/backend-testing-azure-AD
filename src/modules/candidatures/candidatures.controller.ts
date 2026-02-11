import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CandidaturesService } from './candidatures.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  FindCandidaturesQueryDto,
  CreateCandidatureDto,
  CreateManualCandidatureDto,
  CreateLegacyCandidatureDto,
  UpdateCandidatureDto,
  AssignPsychologueDto,
  AssignTestsDto,
  MakeDecisionDto,
  TechnicalInterviewDto,
} from './dto/candidatures.dto';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  status: string;
}

@ApiTags('Candidatures')
@ApiBearerAuth()
@Controller('candidatures')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidaturesController {
  constructor(private readonly candidaturesService: CandidaturesService) {}

  // ============================================================================
  // LIST & QUERY ENDPOINTS
  // ============================================================================

  @Get()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'List candidatures',
    description:
      'Get paginated list of candidatures with filters. All psychologues can see all candidatures (use assignedTo filter for own assignments).',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidatures retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  async findAll(
    @Query() query: FindCandidaturesQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.candidaturesService.findAll(query, user.id);
    return result;
  }

  @Get('dashboard')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get psychologue dashboard',
    description:
      "Get dashboard data including counts by status, recent activity, and today's scheduled exams.",
  })
  @ApiQuery({
    name: 'siteId',
    required: false,
    description: 'Filter by site for performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query('siteId') siteId?: string,
  ) {
    const dashboard = await this.candidaturesService.getDashboard(
      user.id,
      siteId,
    );
    return dashboard;
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get candidature details',
    description: 'Get full candidature details with all related entities.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Candidature retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const candidature = await this.candidaturesService.findById(id);
    return candidature;
  }

  // ============================================================================
  // CREATE ENDPOINTS
  // ============================================================================

  @Post()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Create candidature from job application',
    description:
      'Create a candidature from an approved job application. The job application must have status "approved".',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidature created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Job application not approved or already has candidature',
  })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  async create(
    @Body() dto: CreateCandidatureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.create(dto, user.id);
    return candidature;
  }

  @Post('manual')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Create candidature manually',
    description:
      'Create candidature by selecting an existing candidate. Creates job application automatically. Use for existing users who need a new candidature (including re-evaluations).',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidature created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async createManual(
    @Body() dto: CreateManualCandidatureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.createManual(
      dto,
      user.id,
    );
    return candidature;
  }

  @Post('legacy')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Create legacy candidature (walk-in)',
    description:
      'Create candidature with new candidate in simplified flow. Creates user account + job application + candidature in one request. Used for walk-in candidates.',
  })
  @ApiResponse({
    status: 201,
    description: 'Legacy candidature created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createLegacy(
    @Body() dto: CreateLegacyCandidatureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.candidaturesService.createLegacy(dto, user.id);
    return result;
  }

  // ============================================================================
  // UPDATE ENDPOINTS
  // ============================================================================

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Update candidature',
    description:
      'Update candidature fields (dpNumber, examDate, assignedPsychologue).',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Candidature updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidatureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.update(id, dto, user.id);
    return candidature;
  }

  // ============================================================================
  // ACTION ENDPOINTS
  // ============================================================================

  @Post(':id/assign')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Assign psychologue',
    description: 'Assign candidature to a psychologue. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Candidature assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async assignPsychologue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPsychologueDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.assignPsychologue(
      id,
      dto,
      user.id,
    );
    return candidature;
  }

  @Post(':id/tests')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Assign tests',
    description:
      'Assign tests to candidature. Main logical test is required. Personality test is included by default.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Tests assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid candidature status' })
  @ApiResponse({ status: 404, description: 'Candidature or test not found' })
  async assignTests(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTestsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.assignTests(
      id,
      dto,
      user.id,
    );
    return candidature;
  }

  @Get(':id/results')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get test results',
    description: 'Get all test results for a candidature.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Test results retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async getResults(@Param('id', ParseUUIDPipe) id: string) {
    const results = await this.candidaturesService.getResults(id);
    return results;
  }

  @Post(':id/decision')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Make decision',
    description:
      'Record final decision for candidature. Only assigned psychologue or admin can make decision. Candidature must be in "completed" or "in_review" status.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Decision recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Candidature not ready for decision',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async makeDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MakeDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.makeDecision(
      id,
      dto,
      user.id,
    );
    return candidature;
  }

  @Post(':id/archive')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Archive candidature',
    description:
      'Archive an evaluated candidature. Candidature must be in "evaluated" status.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Candidature archived successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Candidature not in evaluated status',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const candidature = await this.candidaturesService.archive(id, user.id);
    return candidature;
  }

  @Post(':id/technical-interview')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Record technical interview',
    description:
      'Record technical interview results. Adds interviewer notes, rating, and technical observations.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Technical interview recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async recordTechnicalInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TechnicalInterviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const interview = await this.candidaturesService.recordTechnicalInterview(
      id,
      dto,
      user.id,
    );
    return interview;
  }

  @Get(':id/transitions')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get state transitions',
    description:
      'Get audit trail of all state transitions for a candidature. Returns chronological list of status changes.',
  })
  @ApiParam({ name: 'id', description: 'Candidature ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'State transitions retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Candidature not found' })
  async getTransitions(@Param('id', ParseUUIDPipe) id: string) {
    const transitions = await this.candidaturesService.getTransitions(id);
    return transitions;
  }
}
