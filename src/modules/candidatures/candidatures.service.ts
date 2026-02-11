import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  CandidatureStatus,
  DecisionType,
  Prisma,
  UserRole,
  ApplicationStatus,
  UserStatus,
} from '@prisma/client';
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
import { EmailService } from '@modules/notifications/services/email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CandidaturesService {
  private readonly logger = new Logger(CandidaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Find all candidatures with filters and pagination
   */
  async findAll(params: FindCandidaturesQueryDto, currentUserId?: string) {
    const {
      page = 1,
      limit = 20,
      status,
      assignedTo,
      siteId,
      departmentId,
      search,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidatureWhereInput = {};

    // Status filter
    if (status) {
      where.status = status as CandidatureStatus;
    }

    // Assigned to filter (support "me" for current user)
    if (assignedTo) {
      where.assignedPsychologueId =
        assignedTo === 'me' ? currentUserId : assignedTo;
    }

    // Site and department filters (via job application)
    if (siteId || departmentId || search) {
      where.jobApplication = {};
      if (siteId) {
        where.jobApplication.siteId = siteId;
      }
      if (departmentId) {
        where.jobApplication.departmentId = departmentId;
      }
      if (search) {
        where.OR = [
          { dpNumber: { contains: search, mode: 'insensitive' } },
          {
            jobApplication: {
              candidate: {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ];
      }
    }

    // Date filters
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(fromDate);
      }
      if (toDate) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(toDate);
      }
    }

    // Determine sort field
    const orderBy: Prisma.CandidatureOrderByWithRelationInput =
      sortBy === 'examDate'
        ? { examDate: sortOrder }
        : sortBy === 'status'
          ? { status: sortOrder }
          : { createdAt: sortOrder };

    const [candidatures, total] = await Promise.all([
      this.prisma.candidature.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              site: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
          assignedPsychologue: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedLogicalTest: {
            select: { id: true, name: true, type: true },
          },
          assignedOptionalLogicalTest: {
            select: { id: true, name: true, type: true },
          },
          assignedPersonalityTest: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.candidature.count({ where }),
    ]);

    return {
      data: candidatures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get candidature by ID with full details
   */
  async findById(id: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
      include: {
        jobApplication: {
          include: {
            candidate: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                gender: true,
                dateOfBirth: true,
              },
            },
            site: true,
            department: true,
          },
        },
        assignedPsychologue: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assigner: {
          select: { id: true, firstName: true, lastName: true },
        },
        decider: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedLogicalTest: true,
        assignedOptionalLogicalTest: true,
        assignedPersonalityTest: true,
        technicalInterview: true,
        logicalTestAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
        personalityTestAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
        stateTransitions: {
          orderBy: { transitionedAt: 'desc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        previousCandidature: {
          select: {
            id: true,
            dpNumber: true,
            status: true,
            decision: true,
            createdAt: true,
          },
        },
      },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    return candidature;
  }

  /**
   * Get dashboard data for psychologue
   */
  async getDashboard(userId: string, siteId?: string) {
    // Get counts for current user
    const myCountsRaw = await this.prisma.candidature.groupBy({
      by: ['status'],
      where: { assignedPsychologueId: userId },
      _count: true,
    });

    // Get global counts (optionally filtered by site)
    const globalWhere: Prisma.CandidatureWhereInput = siteId
      ? { jobApplication: { siteId } }
      : {};
    const globalCountsRaw = await this.prisma.candidature.groupBy({
      by: ['status'],
      where: globalWhere,
      _count: true,
    });

    // Transform to structured format
    const transformCounts = (
      raw: { status: CandidatureStatus; _count: number }[],
    ) => {
      const counts: Record<string, number> = {
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        inReview: 0,
        evaluated: 0,
        archived: 0,
        total: 0,
      };
      raw.forEach((r) => {
        const key =
          r.status === 'in_progress'
            ? 'inProgress'
            : r.status === 'in_review'
              ? 'inReview'
              : r.status;
        if (key in counts) {
          counts[key] = r._count;
        }
        counts.total += r._count;
      });
      return counts;
    };

    // Today's exams
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysExams = await this.prisma.candidature.count({
      where: {
        examDate: { gte: today, lt: tomorrow },
        status: { in: ['assigned', 'in_progress'] },
      },
    });

    return {
      myCounts: transformCounts(myCountsRaw),
      globalCounts: transformCounts(globalCountsRaw),
      todaysExams,
    };
  }

  // ============================================================================
  // CREATE METHODS
  // ============================================================================

  /**
   * Create candidature from approved job application
   */
  async create(dto: CreateCandidatureDto, assignedBy: string) {
    // Verify job application exists and is approved
    const jobApplication = await this.prisma.jobApplication.findUnique({
      where: { id: dto.jobApplicationId },
      include: { candidature: true },
    });

    if (!jobApplication) {
      throw new NotFoundException('Job application not found');
    }

    if (jobApplication.status !== ApplicationStatus.approved) {
      throw new BadRequestException(
        'Job application must be approved before creating candidature',
      );
    }

    if (jobApplication.candidature) {
      throw new ConflictException('Job application already has a candidature');
    }

    // Verify psychologue if assigned
    if (dto.assignedPsychologueId) {
      const psychologue = await this.prisma.user.findUnique({
        where: { id: dto.assignedPsychologueId },
      });
      if (!psychologue || psychologue.role !== UserRole.psychologue) {
        throw new BadRequestException('Invalid psychologue ID');
      }
    }

    // Create candidature
    const candidature = await this.prisma.candidature.create({
      data: {
        jobApplicationId: dto.jobApplicationId,
        dpNumber: dto.dpNumber,
        assignedPsychologueId: dto.assignedPsychologueId,
        assignedBy: dto.assignedPsychologueId ? assignedBy : undefined,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        status: dto.assignedPsychologueId
          ? CandidatureStatus.assigned
          : CandidatureStatus.pending,
      },
      include: {
        jobApplication: {
          include: {
            candidate: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        assignedPsychologue: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log state transition if assigned
    if (dto.assignedPsychologueId) {
      await this.prisma.candidatureStateTransition.create({
        data: {
          candidatureId: candidature.id,
          fromStatus: CandidatureStatus.pending,
          toStatus: CandidatureStatus.assigned,
          transitionedBy: assignedBy,
          reason: 'Initial assignment',
        },
      });
    }

    this.logger.log(`Candidature created: ${candidature.id}`);
    return candidature;
  }

  /**
   * Create candidature manually by selecting existing candidate
   */
  async createManual(dto: CreateManualCandidatureDto, createdBy: string) {
    // Verify candidate exists
    const candidate = await this.prisma.user.findUnique({
      where: { id: dto.candidateId },
    });

    if (!candidate || candidate.role !== UserRole.candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Verify site and department
    const [site, department] = await Promise.all([
      this.prisma.site.findUnique({ where: { id: dto.siteId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
    ]);

    if (!site) throw new NotFoundException('Site not found');
    if (!department) throw new NotFoundException('Department not found');

    // Check if this is a re-evaluation
    let previousCandidature = null;
    if (dto.previousCandidatureId) {
      previousCandidature = await this.prisma.candidature.findUnique({
        where: { id: dto.previousCandidatureId },
      });
      if (!previousCandidature) {
        throw new NotFoundException('Previous candidature not found');
      }
    }

    // Verify psychologue if provided
    if (dto.assignedPsychologueId) {
      const psychologue = await this.prisma.user.findUnique({
        where: { id: dto.assignedPsychologueId },
      });
      if (!psychologue || psychologue.role !== UserRole.psychologue) {
        throw new BadRequestException('Invalid psychologue ID');
      }
    }

    // Use transaction to create job application and candidature
    const result = await this.prisma.$transaction(async (tx) => {
      // Create job application
      const jobApplication = await tx.jobApplication.create({
        data: {
          candidateId: dto.candidateId,
          siteId: dto.siteId,
          departmentId: dto.departmentId,
          targetPosition: dto.positionApplied || 'Not specified',
          status: ApplicationStatus.approved,
          reviewedBy: createdBy,
          reviewedAt: new Date(),
        },
      });

      // Create candidature
      const candidature = await tx.candidature.create({
        data: {
          jobApplicationId: jobApplication.id,
          dpNumber: dto.dpNumber,
          assignedPsychologueId: dto.assignedPsychologueId,
          assignedBy: dto.assignedPsychologueId ? createdBy : undefined,
          previousCandidatureId: dto.previousCandidatureId,
          isReevaluation: !!dto.previousCandidatureId,
          status: dto.assignedPsychologueId
            ? CandidatureStatus.assigned
            : CandidatureStatus.pending,
        },
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              site: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
          assignedPsychologue: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return candidature;
    });

    this.logger.log(`Manual candidature created: ${result.id}`);
    return result;
  }

  /**
   * Create legacy candidature (walk-in: user + job application + candidature)
   */
  async createLegacy(dto: CreateLegacyCandidatureDto, createdBy: string) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.candidate.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Verify site and department
    const [site, department] = await Promise.all([
      this.prisma.site.findUnique({ where: { id: dto.siteId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
    ]);

    if (!site) throw new NotFoundException('Site not found');
    if (!department) throw new NotFoundException('Department not found');

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);

    // Use transaction to create everything
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.candidate.email,
          passwordHash: hashedPassword,
          firstName: dto.candidate.firstName,
          lastName: dto.candidate.lastName,
          phone: dto.candidate.phone,
          gender: dto.candidate.gender,
          dateOfBirth: dto.candidate.dateOfBirth
            ? new Date(dto.candidate.dateOfBirth)
            : undefined,
          role: UserRole.candidate,
          status: UserStatus.active,
          isEmailVerified: true, // Skip verification for legacy
        },
      });

      // Create job application
      const jobApplication = await tx.jobApplication.create({
        data: {
          candidateId: user.id,
          siteId: dto.siteId,
          departmentId: dto.departmentId,
          targetPosition: dto.positionApplied || 'Not specified',
          status: ApplicationStatus.approved,
          reviewedBy: createdBy,
          reviewedAt: new Date(),
        },
      });

      // Create candidature
      const candidature = await tx.candidature.create({
        data: {
          jobApplicationId: jobApplication.id,
          dpNumber: dto.dpNumber,
          status: CandidatureStatus.pending,
        },
      });

      // Create technical interview if provided
      if (dto.technicalInterview) {
        await tx.technicalInterview.create({
          data: {
            candidatureId: candidature.id,
            interviewDate: new Date(dto.technicalInterview.interviewDate),
            interviewerName: dto.technicalInterview.interviewerName,
            decision: dto.technicalInterview.decision as DecisionType,
            notes: dto.technicalInterview.notes,
            conductedBy: createdBy,
          },
        });
      }

      return {
        candidature: await tx.candidature.findUnique({
          where: { id: candidature.id },
          include: {
            jobApplication: {
              include: {
                candidate: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                site: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
              },
            },
            technicalInterview: true,
          },
        }),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        temporaryPassword:
          dto.sendCredentials === false ? temporaryPassword : undefined,
      };
    });

    // Send credentials email if requested
    let emailSent = false;
    if (dto.sendCredentials !== false) {
      try {
        await this.emailService.sendAccountCreatedEmail({
          email: dto.candidate.email,
          firstName: dto.candidate.firstName,
          temporaryPassword,
        });
        emailSent = true;
      } catch (error) {
        this.logger.error('Failed to send credentials email', error);
      }
    }

    this.logger.log(`Legacy candidature created: ${result.candidature?.id}`);

    return {
      ...result,
      emailSent,
    };
  }

  // ============================================================================
  // UPDATE METHODS
  // ============================================================================

  /**
   * Update candidature fields
   */
  async update(id: string, dto: UpdateCandidatureDto, userId: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Verify psychologue if changing assignment
    if (dto.assignedPsychologueId) {
      const psychologue = await this.prisma.user.findUnique({
        where: { id: dto.assignedPsychologueId },
      });
      if (!psychologue || psychologue.role !== UserRole.psychologue) {
        throw new BadRequestException('Invalid psychologue ID');
      }
    }

    const updateData: Prisma.CandidatureUpdateInput = {};
    if (dto.dpNumber !== undefined) updateData.dpNumber = dto.dpNumber;
    if (dto.examDate !== undefined)
      updateData.examDate = dto.examDate ? new Date(dto.examDate) : null;
    if (dto.assignedPsychologueId !== undefined) {
      updateData.assignedPsychologue = dto.assignedPsychologueId
        ? { connect: { id: dto.assignedPsychologueId } }
        : { disconnect: true };
      updateData.assigner = { connect: { id: userId } };
    }

    return this.prisma.candidature.update({
      where: { id },
      data: updateData,
      include: {
        jobApplication: {
          include: {
            candidate: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        assignedPsychologue: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ============================================================================
  // ACTION METHODS
  // ============================================================================

  /**
   * Assign psychologue to candidature
   */
  async assignPsychologue(
    id: string,
    dto: AssignPsychologueDto,
    assignedBy: string,
  ) {
    if (!assignedBy) {
      throw new BadRequestException('Current user ID is required');
    }

    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Verify psychologue
    const psychologue = await this.prisma.user.findUnique({
      where: { id: dto.psychologueId },
    });

    if (!psychologue || psychologue.role !== UserRole.psychologue) {
      throw new BadRequestException('Invalid psychologue ID');
    }

    // Update candidature and log transition
    return this.prisma.$transaction(async (tx) => {
      // Log state transition if status changes
      if (candidature.status === CandidatureStatus.pending) {
        await tx.candidatureStateTransition.create({
          data: {
            candidatureId: id,
            fromStatus: candidature.status,
            toStatus: CandidatureStatus.assigned,
            transitionedBy: assignedBy,
            reason: `Assigned to ${psychologue.firstName} ${psychologue.lastName}`,
          },
        });
      }

      return tx.candidature.update({
        where: { id },
        data: {
          assignedPsychologueId: dto.psychologueId,
          assignedBy,
          assignmentDate: new Date(),
          status:
            candidature.status === CandidatureStatus.pending
              ? CandidatureStatus.assigned
              : candidature.status,
        },
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          assignedPsychologue: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  /**
   * Assign tests to candidature
   */
  async assignTests(id: string, dto: AssignTestsDto, assignedBy: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
      include: { jobApplication: { include: { candidate: true } } },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Verify candidature is in valid status
    if (
      !(
        [
          CandidatureStatus.pending,
          CandidatureStatus.assigned,
        ] as CandidatureStatus[]
      ).includes(candidature.status)
    ) {
      throw new BadRequestException(
        'Tests can only be assigned to pending or assigned candidatures',
      );
    }

    // Verify main logical test
    const logicalTest = await this.prisma.logicalTest.findUnique({
      where: { id: dto.logicalTestId },
    });
    if (!logicalTest) {
      throw new NotFoundException('Logical test not found');
    }

    // Verify optional logical test if provided
    if (dto.optionalLogicalTestId) {
      const optionalTest = await this.prisma.logicalTest.findUnique({
        where: { id: dto.optionalLogicalTestId },
      });
      if (!optionalTest) {
        throw new NotFoundException('Optional logical test not found');
      }
    }

    // Get personality test if included (default true)
    let personalityTestId: string | undefined;
    if (dto.includePersonalityTest !== false) {
      const personalityTest = await this.prisma.personalityTest.findFirst({
        where: { isActive: true },
      });
      if (personalityTest) {
        personalityTestId = personalityTest.id;
      }
    }

    // Determine new status
    const newStatus = candidature.assignedPsychologueId
      ? CandidatureStatus.assigned
      : CandidatureStatus.assigned;

    // Update candidature with tests
    const result = await this.prisma.$transaction(async (tx) => {
      // Log state transition if status changes
      if (candidature.status !== newStatus) {
        await tx.candidatureStateTransition.create({
          data: {
            candidatureId: id,
            fromStatus: candidature.status,
            toStatus: newStatus,
            transitionedBy: assignedBy,
            reason: 'Tests assigned',
          },
        });
      }

      return tx.candidature.update({
        where: { id },
        data: {
          assignedLogicalTestId: dto.logicalTestId,
          assignedOptionalLogicalTestId: dto.optionalLogicalTestId,
          assignedPersonalityTestId: personalityTestId,
          examDate: dto.examDate
            ? new Date(dto.examDate)
            : candidature.examDate,
          status: newStatus,
        },
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          assignedLogicalTest: true,
          assignedOptionalLogicalTest: true,
          assignedPersonalityTest: true,
        },
      });
    });

    // TODO: Send notification email if notifyCandidate is true
    if (dto.notifyCandidate !== false && candidature.jobApplication.candidate) {
      this.logger.log(
        `Test assignment notification would be sent to ${candidature.jobApplication.candidate.email}`,
      );
    }

    return result;
  }

  /**
   * Get test results for candidature
   */
  async getResults(id: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
      include: {
        assignedLogicalTest: true,
        assignedOptionalLogicalTest: true,
        assignedPersonalityTest: true,
        logicalTestAttempts: {
          where: { status: 'completed' },
          orderBy: { submittedAt: 'desc' },
          take: 2,
        },
        personalityTestAttempts: {
          where: { status: 'completed' },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    return {
      candidatureId: id,
      logicalTests: candidature.logicalTestAttempts,
      personalityTests: candidature.personalityTestAttempts,
      assignedTests: {
        logicalTest: candidature.assignedLogicalTest,
        optionalLogicalTest: candidature.assignedOptionalLogicalTest,
        personalityTest: candidature.assignedPersonalityTest,
      },
    };
  }

  /**
   * Record final decision
   */
  async makeDecision(id: string, dto: MakeDecisionDto, decidedBy: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Verify candidature is in valid status for decision
    if (
      !(
        [
          CandidatureStatus.completed,
          CandidatureStatus.in_review,
        ] as CandidatureStatus[]
      ).includes(candidature.status)
    ) {
      throw new BadRequestException(
        'Decision can only be made on completed or in-review candidatures',
      );
    }

    // Update candidature with decision
    return this.prisma.$transaction(async (tx) => {
      // Log state transition
      await tx.candidatureStateTransition.create({
        data: {
          candidatureId: id,
          fromStatus: candidature.status,
          toStatus: CandidatureStatus.evaluated,
          transitionedBy: decidedBy,
          reason: `Decision: ${dto.decision}${dto.comments ? ` - ${dto.comments}` : ''}`,
        },
      });

      return tx.candidature.update({
        where: { id },
        data: {
          decision: dto.decision as DecisionType,
          decisionDate: new Date(),
          decisionBy: decidedBy,
          decisionComments: dto.comments,
          status: CandidatureStatus.evaluated,
        },
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          assignedPsychologue: {
            select: { id: true, firstName: true, lastName: true },
          },
          decider: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  /**
   * Archive candidature
   */
  async archive(id: string, archivedBy: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    if (candidature.status !== CandidatureStatus.evaluated) {
      throw new BadRequestException(
        'Only evaluated candidatures can be archived',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.candidatureStateTransition.create({
        data: {
          candidatureId: id,
          fromStatus: candidature.status,
          toStatus: CandidatureStatus.archived,
          transitionedBy: archivedBy,
          reason: 'Archived',
        },
      });

      return tx.candidature.update({
        where: { id },
        data: { status: CandidatureStatus.archived },
        include: {
          jobApplication: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Record technical interview
   */
  async recordTechnicalInterview(
    id: string,
    dto: TechnicalInterviewDto,
    conductedBy: string,
  ) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
      include: { technicalInterview: true },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Check if technical interview already exists
    if (candidature.technicalInterview) {
      // Update existing
      return this.prisma.technicalInterview.update({
        where: { id: candidature.technicalInterview.id },
        data: {
          interviewDate: new Date(dto.interviewDate),
          interviewerName: dto.interviewerName,
          decision: dto.decision as DecisionType,
          notes: dto.notes,
          conductedBy,
        },
      });
    }

    // Create new
    return this.prisma.technicalInterview.create({
      data: {
        candidatureId: id,
        interviewDate: new Date(dto.interviewDate),
        interviewerName: dto.interviewerName,
        decision: dto.decision as DecisionType,
        notes: dto.notes,
        conductedBy,
      },
    });
  }

  /**
   * Get state transitions for candidature
   */
  async getTransitions(id: string) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    return this.prisma.candidatureStateTransition.findMany({
      where: { candidatureId: id },
      orderBy: { transitionedAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Update status with state transition logging
   */
  async updateStatus(
    id: string,
    newStatus: CandidatureStatus,
    userId: string,
    reason?: string,
  ) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature not found');
    }

    // Use transaction to update status and log transition
    return this.prisma.$transaction(async (tx) => {
      // Log state transition
      await tx.candidatureStateTransition.create({
        data: {
          candidatureId: id,
          fromStatus: candidature.status,
          toStatus: newStatus,
          transitionedBy: userId,
          reason,
        },
      });

      // Update candidature status
      return tx.candidature.update({
        where: { id },
        data: { status: newStatus },
      });
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateTemporaryPassword(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
