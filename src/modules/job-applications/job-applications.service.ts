import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { ApplicationStatus, Prisma } from '@prisma/client';
import {
  CreateJobApplicationDto,
  ReviewJobApplicationDto,
  ReviewDecision,
  FindJobApplicationsQueryDto,
} from './dto';

@Injectable()
export class JobApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new job application for a candidate
   */
  async create(candidateId: string, dto: CreateJobApplicationDto) {
    // Verify site exists and is active
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (!site.isActive) {
      throw new BadRequestException('Site is not active');
    }

    // Verify department exists and is active
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    if (!department.isActive) {
      throw new BadRequestException('Department is not active');
    }

    // Check if user already has a pending application for same site/department/position
    const existingApplication = await this.prisma.jobApplication.findFirst({
      where: {
        candidateId,
        siteId: dto.siteId,
        departmentId: dto.departmentId,
        targetPosition: dto.targetPosition,
        status: 'pending',
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You already have a pending application for this position',
      );
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        candidateId,
        siteId: dto.siteId,
        departmentId: dto.departmentId,
        targetPosition: dto.targetPosition,
        currentPosition: dto.currentPosition,
        educationLevel: dto.educationLevel,
        availability: dto.availability ? new Date(dto.availability) : null,
        motivation: dto.motivation,
        cvUrl: dto.cvUrl,
        additionalInfo: dto.additionalInfo,
        status: 'pending',
      },
      include: {
        site: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return application;
  }

  /**
   * Find all job applications with filtering and pagination
   * For admin/psychologue use
   */
  async findAll(query: FindJobApplicationsQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      siteId,
      departmentId,
      candidateId,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.JobApplicationWhereInput = {};

    if (status) {
      where.status = status as ApplicationStatus;
    }
    if (siteId) {
      where.siteId = siteId;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (candidateId) {
      where.candidateId = candidateId;
    }

    const [data, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          site: {
            select: { id: true, name: true, code: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all applications for a specific candidate (their own applications)
   */
  async findByCandidate(
    candidateId: string,
    query: FindJobApplicationsQueryDto,
  ) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.JobApplicationWhereInput = {
      candidateId,
    };

    if (status) {
      where.status = status as ApplicationStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          site: {
            select: { id: true, name: true, code: true, country: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          candidature: {
            select: {
              id: true,
              status: true,
              dpNumber: true,
              examDate: true,
            },
          },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single job application by ID
   */
  async findOne(id: string, requesterId?: string, requesterRole?: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
            country: true,
            siteType: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true, description: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        candidature: {
          select: {
            id: true,
            status: true,
            dpNumber: true,
            examDate: true,
            decision: true,
            decisionDate: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    // Candidates can only view their own applications
    if (
      requesterRole === 'candidate' &&
      requesterId &&
      application.candidateId !== requesterId
    ) {
      throw new ForbiddenException('You can only view your own applications');
    }

    return application;
  }

  /**
   * Review (approve/reject) a job application
   * Creates a Candidature when approved
   */
  async review(id: string, reviewerId: string, dto: ReviewJobApplicationDto) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { candidature: true },
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(
        `Application has already been ${application.status}`,
      );
    }

    if (dto.decision === ReviewDecision.rejected && !dto.rejectionReason) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting an application',
      );
    }

    const newStatus =
      dto.decision === ReviewDecision.approved ? 'approved' : 'rejected';

    // Use transaction: update application and create candidature if approved
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.jobApplication.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          rejectionReason:
            dto.decision === ReviewDecision.rejected
              ? dto.rejectionReason
              : null,
        },
        include: {
          candidate: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          site: {
            select: { id: true, name: true, code: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      let candidature = null;

      // If approved, create a Candidature for this application
      if (dto.decision === ReviewDecision.approved) {
        candidature = await tx.candidature.create({
          data: {
            jobApplicationId: id,
            status: 'pending',
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        });
      }

      return { application: updatedApplication, candidature };
    });

    return result;
  }

  /**
   * Withdraw an application (by candidate)
   */
  async withdraw(id: string, candidateId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Job application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new ForbiddenException(
        'You can only withdraw your own applications',
      );
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(
        `Cannot withdraw application with status: ${application.status}`,
      );
    }

    const updatedApplication = await this.prisma.jobApplication.update({
      where: { id },
      data: {
        status: 'withdrawn',
      },
      include: {
        site: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return updatedApplication;
  }

  /**
   * Get application statistics (for dashboard)
   */
  async getStatistics(siteId?: string, departmentId?: string) {
    const where: Prisma.JobApplicationWhereInput = {};

    if (siteId) {
      where.siteId = siteId;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [total, pending, approved, rejected, withdrawn] = await Promise.all([
      this.prisma.jobApplication.count({ where }),
      this.prisma.jobApplication.count({
        where: { ...where, status: 'pending' },
      }),
      this.prisma.jobApplication.count({
        where: { ...where, status: 'approved' },
      }),
      this.prisma.jobApplication.count({
        where: { ...where, status: 'rejected' },
      }),
      this.prisma.jobApplication.count({
        where: { ...where, status: 'withdrawn' },
      }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        approved,
        rejected,
        withdrawn,
      },
    };
  }
}
