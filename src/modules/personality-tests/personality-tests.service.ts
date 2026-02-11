import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class PersonalityTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = params;
    const skip = (page - 1) * limit;

    const where = isActive !== undefined ? { isActive } : {};

    const [tests, total] = await Promise.all([
      this.prisma.personalityTest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.personalityTest.count({ where }),
    ]);

    return {
      data: tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const test = await this.prisma.personalityTest.findUnique({
      where: { id },
    });

    if (!test) {
      throw new NotFoundException('Personality test not found');
    }

    return test;
  }

  async getCategories() {
    return this.prisma.personalityCategory.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      include: {
        facets: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async getQuestions(testId: string, language: 'fr' | 'en' = 'fr') {
    const test = await this.prisma.personalityTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new NotFoundException('Personality test not found');
    }

    return this.prisma.personalityQuestion.findMany({
      where: { testId, deletedAt: null },
      orderBy: { globalOrder: 'asc' },
      include: {
        facet: {
          include: {
            category: true,
          },
        },
      },
    });
  }
}
