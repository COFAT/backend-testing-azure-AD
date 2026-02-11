import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  FindDepartmentsQueryDto,
  AssignSiteDto,
} from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new department
   */
  async create(dto: CreateDepartmentDto) {
    // Check for duplicate code
    const existing = await this.prisma.department.findFirst({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Department with this code already exists');
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Find all departments with pagination and filters
   */
  async findAll(query: FindDepartmentsQueryDto) {
    const { page = 1, limit = 20, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { siteDepartments: true },
          },
        },
      }),
      this.prisma.department.count({ where }),
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
   * Find active departments only
   */
  async findActive() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
    });
  }

  /**
   * Find a single department by ID
   */
  async findById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        siteDepartments: {
          include: {
            site: {
              select: {
                id: true,
                name: true,
                code: true,
                country: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  /**
   * Update a department
   */
  async update(id: string, dto: UpdateDepartmentDto) {
    // Check department exists
    await this.findById(id);

    // Check for duplicate code (excluding current department)
    if (dto.code) {
      const existing = await this.prisma.department.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Department with this code already exists');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete a department
   */
  async delete(id: string) {
    const department = await this.findById(id);

    // Check if department is linked to any sites
    if (department.siteDepartments.length > 0) {
      throw new ConflictException(
        'Cannot delete department linked to sites. Remove site associations first.',
      );
    }

    return this.prisma.department.delete({
      where: { id },
    });
  }

  /**
   * Assign department to a site
   */
  async assignToSite(departmentId: string, dto: AssignSiteDto) {
    // Verify department exists
    await this.findById(departmentId);

    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Check if already assigned
    const existing = await this.prisma.siteDepartment.findUnique({
      where: {
        siteId_departmentId: {
          siteId: dto.siteId,
          departmentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Department is already assigned to this site',
      );
    }

    return this.prisma.siteDepartment.create({
      data: {
        siteId: dto.siteId,
        departmentId,
        isActive: dto.isActive ?? true,
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
  }

  /**
   * Remove department from a site
   */
  async removeFromSite(departmentId: string, siteId: string) {
    const siteDepartment = await this.prisma.siteDepartment.findUnique({
      where: {
        siteId_departmentId: {
          siteId,
          departmentId,
        },
      },
    });

    if (!siteDepartment) {
      throw new NotFoundException('Department is not assigned to this site');
    }

    return this.prisma.siteDepartment.delete({
      where: { id: siteDepartment.id },
    });
  }

  /**
   * Get sites where this department is available
   */
  async getSites(departmentId: string, activeOnly = true) {
    await this.findById(departmentId);

    const where: any = { departmentId };
    if (activeOnly) {
      where.isActive = true;
      where.site = { isActive: true };
    }

    const siteDepartments = await this.prisma.siteDepartment.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true,
            country: true,
            siteType: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        site: { name: 'asc' },
      },
    });

    return siteDepartments.map((sd) => sd.site);
  }
}
