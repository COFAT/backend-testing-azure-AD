import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@shared/dto/pagination.dto';
import {
  CandidatureStatusDto,
  DecisionTypeDto,
  GenderDto,
} from '@shared/dto/enums.dto';

// ============================================================================
// QUERY DTOs
// ============================================================================

/**
 * Query DTO for listing candidatures with filters
 */
export class FindCandidaturesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CandidatureStatusDto,
    description: 'Filter by candidature status',
    example: CandidatureStatusDto.in_progress,
  })
  @IsOptional()
  @IsEnum(CandidatureStatusDto)
  status?: CandidatureStatusDto;

  @ApiPropertyOptional({
    description:
      'Filter by assigned psychologue ID (use "me" for current user)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

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
    description: 'Search by candidate name, email, or DP number',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter candidatures created after this date',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter candidatures created before this date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'examDate', 'status'],
    description: 'Sort field',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'examDate' | 'status';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// CREATE DTOs
// ============================================================================

/**
 * Create candidature from approved job application
 */
export class CreateCandidatureDto {
  @ApiProperty({
    description: 'Job application ID (must be approved)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  jobApplicationId: string;

  @ApiPropertyOptional({
    description: 'DP Number (internal reference)',
    example: 'DP-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dpNumber?: string;

  @ApiPropertyOptional({
    description: 'Assign to psychologue immediately',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  assignedPsychologueId?: string;

  @ApiPropertyOptional({
    description: 'Scheduled exam date',
    example: '2026-02-10T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  examDate?: string;
}

/**
 * Create candidature manually by selecting existing candidate
 * Used for re-evaluations or when candidate exists but needs new candidature
 */
export class CreateManualCandidatureDto {
  @ApiProperty({
    description: 'Candidate user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;

  @ApiProperty({
    description: 'Site ID for the job application',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Department ID for the job application',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({
    description: 'Position applying for',
    example: 'Machine Operator',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  positionApplied?: string;

  @ApiPropertyOptional({
    description: 'DP Number (internal reference)',
    example: 'DP-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dpNumber?: string;

  @ApiPropertyOptional({
    description: 'Assign to psychologue immediately',
  })
  @IsOptional()
  @IsUUID()
  assignedPsychologueId?: string;

  @ApiPropertyOptional({
    description: 'Previous candidature ID (for re-evaluation)',
  })
  @IsOptional()
  @IsUUID()
  previousCandidatureId?: string;
}

/**
 * Candidate info for legacy candidature creation
 */
export class LegacyCandidateInfoDto {
  @ApiProperty({ example: 'john.doe@email.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  cin?: string;

  @ApiPropertyOptional({ enum: GenderDto })
  @IsOptional()
  @IsEnum(GenderDto)
  gender?: GenderDto;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

/**
 * Technical interview for legacy candidature
 */
export class LegacyTechnicalInterviewDto {
  @ApiProperty({ example: '2026-02-01T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  interviewDate: string;

  @ApiProperty({ example: 'M. Martin' })
  @IsNotEmpty()
  @IsString()
  interviewerName: string;

  @ApiProperty({ enum: DecisionTypeDto })
  @IsNotEmpty()
  @IsEnum(DecisionTypeDto)
  decision: DecisionTypeDto;

  @ApiPropertyOptional({ example: 'Excellent technical skills' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Create legacy/walk-in candidature (user + job application + candidature in one)
 * Simplified flow for walk-in candidates
 */
export class CreateLegacyCandidatureDto {
  @ApiProperty({ type: LegacyCandidateInfoDto })
  @ValidateNested()
  @Type(() => LegacyCandidateInfoDto)
  candidate: LegacyCandidateInfoDto;

  @ApiProperty({
    description: 'Site ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Department ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({
    description: 'Position applied for',
    example: 'Machine Operator',
  })
  @IsOptional()
  @IsString()
  positionApplied?: string;

  @ApiPropertyOptional({
    description: 'DP Number',
    example: 'DP-2026-001',
  })
  @IsOptional()
  @IsString()
  dpNumber?: string;

  @ApiPropertyOptional({
    description: 'Technical interview data (if already done)',
    type: LegacyTechnicalInterviewDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegacyTechnicalInterviewDto)
  technicalInterview?: LegacyTechnicalInterviewDto;

  @ApiPropertyOptional({
    description: 'Send credentials email to candidate',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendCredentials?: boolean;
}

// ============================================================================
// UPDATE DTOs
// ============================================================================

/**
 * Update candidature fields
 */
export class UpdateCandidatureDto {
  @ApiPropertyOptional({
    description: 'DP Number',
    example: 'DP-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dpNumber?: string;

  @ApiPropertyOptional({
    description: 'Scheduled exam date',
    example: '2026-02-10T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiPropertyOptional({
    description: 'Assigned psychologue ID',
  })
  @IsOptional()
  @IsUUID()
  assignedPsychologueId?: string;
}

// ============================================================================
// ACTION DTOs
// ============================================================================

/**
 * Assign psychologue to candidature
 */
export class AssignPsychologueDto {
  @ApiProperty({
    description: 'Psychologue user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  psychologueId: string;
}

/**
 * Assign tests to candidature
 */
export class AssignTestsDto {
  @ApiProperty({
    description: 'Main logical test ID (required)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  logicalTestId: string;

  @ApiPropertyOptional({
    description: 'Optional second logical test ID',
  })
  @IsOptional()
  @IsUUID()
  optionalLogicalTestId?: string;

  @ApiPropertyOptional({
    description: 'Include personality test (NEO PI-R)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includePersonalityTest?: boolean;

  @ApiPropertyOptional({
    description: 'Scheduled exam date',
    example: '2026-02-10T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiPropertyOptional({
    description: 'Send notification email to candidate',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyCandidate?: boolean;
}

/**
 * Record final decision
 */
export class MakeDecisionDto {
  @ApiProperty({
    enum: DecisionTypeDto,
    description: 'Final decision',
    example: DecisionTypeDto.favorable,
  })
  @IsNotEmpty()
  @IsEnum(DecisionTypeDto)
  decision: DecisionTypeDto;

  @ApiPropertyOptional({
    description: 'Decision comments/justification',
    example:
      'Excellent logical reasoning, personality profile matches position requirements',
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Link to evaluation report',
  })
  @IsOptional()
  @IsUUID()
  reportId?: string;
}

/**
 * Record technical interview
 */
export class TechnicalInterviewDto {
  @ApiProperty({
    description: 'Interview date',
    example: '2026-02-01T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  interviewDate: string;

  @ApiProperty({
    description: 'Technical interviewer name',
    example: 'M. Ahmed Ben Ali',
  })
  @IsNotEmpty()
  @IsString()
  interviewerName: string;

  @ApiProperty({
    enum: DecisionTypeDto,
    description: 'Interview decision',
    example: DecisionTypeDto.favorable,
  })
  @IsNotEmpty()
  @IsEnum(DecisionTypeDto)
  decision: DecisionTypeDto;

  @ApiPropertyOptional({
    description: 'Interview notes',
    example:
      'Strong technical background, recommended for psychotechnical evaluation',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Dashboard counts
 */
export class DashboardCountsDto {
  @ApiProperty({ example: 5 })
  pending: number;

  @ApiProperty({ example: 12 })
  assigned: number;

  @ApiProperty({ example: 8 })
  inProgress: number;

  @ApiProperty({ example: 15 })
  completed: number;

  @ApiProperty({ example: 7 })
  inReview: number;

  @ApiProperty({ example: 20 })
  evaluated: number;

  @ApiProperty({ example: 50 })
  total: number;
}

/**
 * Dashboard response
 */
export class DashboardDataDto {
  @ApiProperty({ type: DashboardCountsDto })
  myCounts: DashboardCountsDto;

  @ApiProperty({ type: DashboardCountsDto })
  globalCounts: DashboardCountsDto;

  @ApiProperty({ description: 'Exams scheduled for today' })
  todaysExams: number;

  @ApiPropertyOptional()
  recentActivity?: any[];
}
