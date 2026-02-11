import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ReportLanguage } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    candidatureId?: string;
    language?: ReportLanguage;
  }) {
    const { page = 1, limit = 20, candidatureId, language } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (candidatureId) where.candidatureId = candidatureId;
    if (language) where.language = language;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: 'desc' },
        include: {
          candidature: {
            include: {
              jobApplication: {
                include: {
                  candidate: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          generator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        candidature: {
          include: {
            jobApplication: {
              include: {
                candidate: true,
                site: true,
                department: true,
              },
            },
            logicalTestAttempts: true,
            personalityTestAttempts: {
              include: {
                facetScores: {
                  include: { facet: true },
                },
                categoryScores: {
                  include: { category: true },
                },
              },
            },
          },
        },
        generator: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async findByCandidature(candidatureId: string) {
    return this.prisma.report.findMany({
      where: { candidatureId },
      orderBy: { version: 'desc' },
    });
  }
}
