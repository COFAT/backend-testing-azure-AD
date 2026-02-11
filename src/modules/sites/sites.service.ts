import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto, FindSitesQueryDto } from './dto';
import { SiteType } from '@prisma/client';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new site
   */
  async create(dto: CreateSiteDto) {
    // Check for duplicate name or code
    const existing = await this.prisma.site.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });

    if (existing) {
      const field = existing.name === dto.name ? 'name' : 'code';
      throw new ConflictException(`Site with this ${field} already exists`);
    }

    return this.prisma.site.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        country: dto.country,
        timezone: dto.timezone || 'UTC',
        siteType: dto.siteType as SiteType,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Find all sites with pagination and filters
   */
  async findAll(query: FindSitesQueryDto) {
    const { page = 1, limit = 20, country, siteType, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (country) {
      where.country = country;
    }

    if (siteType) {
      where.siteType = siteType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { siteDepartments: true, users: true },
          },
        },
      }),
      this.prisma.site.count({ where }),
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
   * Find active sites only (for candidates)
   */
  async findActive() {
    return this.prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        country: true,
        siteType: true,
      },
    });
  }

  /**
   * Find a single site by ID
   */
  async findById(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        siteDepartments: {
          where: { isActive: true },
          include: {
            department: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  /**
   * Update a site
   */
  async update(id: string, dto: UpdateSiteDto) {
    // Check site exists
    await this.findById(id);

    // Check for duplicate name or code (excluding current site)
    if (dto.name || dto.code) {
      const existing = await this.prisma.site.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                dto.name ? { name: dto.name } : {},
                dto.code ? { code: dto.code } : {},
              ].filter((o) => Object.keys(o).length > 0),
            },
          ],
        },
      });

      if (existing) {
        const field = existing.name === dto.name ? 'name' : 'code';
        throw new ConflictException(`Site with this ${field} already exists`);
      }
    }

    return this.prisma.site.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.country && { country: dto.country }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.siteType && { siteType: dto.siteType as SiteType }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete a site (soft delete by deactivating)
   */
  async delete(id: string) {
    const site = await this.findById(id);

    // Check if site has users
    if (site._count.users > 0) {
      throw new ConflictException(
        'Cannot delete site with associated users. Deactivate instead.',
      );
    }

    return this.prisma.site.delete({
      where: { id },
    });
  }

  /**
   * Get departments available at a specific site
   */
  async getDepartments(siteId: string, activeOnly = true) {
    // Verify site exists
    await this.findById(siteId);

    const where: any = { siteId };
    if (activeOnly) {
      where.isActive = true;
      where.department = { isActive: true };
    }

    const siteDepartments = await this.prisma.siteDepartment.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        department: { name: 'asc' },
      },
    });

    return siteDepartments.map((sd) => sd.department);
  }
}
