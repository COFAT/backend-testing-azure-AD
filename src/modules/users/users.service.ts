import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Prisma, UserRole, UserStatus, Gender } from '@prisma/client';
import { UploadService } from '@modules/upload/upload.service';
import { JobApplicationsService } from '@modules/job-applications/job-applications.service';
import { EmailService } from '@modules/notifications/services/email.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly jobApplicationsService: JobApplicationsService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }) {
    const { page = 1, limit = 20, role, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          gender: true,
          phone: true,
          siteId: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        profilePictureUrl: true,
        siteId: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({ where: { id } });
  }

  /**
   * Complete candidate profile after OTP verification
   * This does TWO things:
   * 1. Updates User profile (gender, dateOfBirth, phone)
   * 2. Creates a JobApplication (siteId, departmentId, targetPosition, etc.)
   *
   * Changes status from pending_profile -> active
   */
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.pending_profile) {
      throw new BadRequestException(
        'Profile can only be completed when status is pending_profile',
      );
    }

    // 1. Update User profile and status
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        gender: dto.gender as Gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        phone: dto.phone,
        status: UserStatus.active,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        status: true,
        profilePictureUrl: true,
      },
    });

    // 2. Create JobApplication via JobApplicationsService
    const jobApplication = await this.jobApplicationsService.create(userId, {
      siteId: dto.siteId,
      departmentId: dto.departmentId,
      targetPosition: dto.targetPosition,
      currentPosition: dto.currentPosition,
      educationLevel: dto.educationLevel,
      availability: dto.availability,
      motivation: dto.motivation,
    });

    return { user: updatedUser, jobApplication };
  }

  /**
   * Update user profile (for authenticated users)
   * Only updates User table fields - not JobApplication fields
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.gender) updateData.gender = dto.gender as Gender;
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        status: true,
        profilePictureUrl: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Upload or update profile photo
   */
  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upload new photo (compresses and converts to WebP)
    const uploadResult = await this.uploadService.uploadProfilePhoto(
      file,
      userId,
    );

    // Delete old photo if exists
    if (user.profilePictureUrl) {
      await this.uploadService.deleteFile(user.profilePictureUrl);
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl: uploadResult.url },
    });

    return { profilePictureUrl: uploadResult.url };
  }

  /**
   * Admin creates a new user with temporary password
   * Password format: COFAT-{FirstName}{4RandomChars}
   */
  async adminCreateUser(dto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Generate temporary password: COFAT-{FirstName}{4RandomChars}
    const randomChars = this.generateRandomChars(4);
    const tempPassword = `COFAT-${dto.firstName}${randomChars}`;

    // Hash password
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user (admin/psychologue - no job application needed)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as UserRole,
        phone: dto.phone,
        siteId: dto.siteId,
        status: UserStatus.active,
        isEmailVerified: true, // Admin-created users are pre-verified
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        siteId: true,
        createdAt: true,
      },
    });

    // Send welcome email with credentials if requested
    const shouldSendEmail = dto.sendEmail ?? true;
    if (shouldSendEmail) {
      try {
        await this.emailService.sendAccountCreatedEmail({
          email: user.email,
          firstName: user.firstName,
          temporaryPassword: tempPassword,
        });
      } catch (error) {
        // Log error but don't fail user creation if email fails
        console.error('Failed to send credentials email:', error);
      }
    }

    return {
      user,
      temporaryPassword: tempPassword,
      emailSent: shouldSendEmail,
    };
  }

  /**
   * Get current user profile (me endpoint)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        profilePictureUrl: true,
        siteId: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        // Include job applications for candidates
        jobApplicationsAsCandidate: {
          select: {
            id: true,
            targetPosition: true,
            status: true,
            siteId: true,
            departmentId: true,
            site: {
              select: { id: true, name: true, code: true },
            },
            department: {
              select: { id: true, name: true, code: true },
            },
            candidature: {
              select: {
                id: true,
                status: true,
                dpNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Generate random alphanumeric characters
   */
  private generateRandomChars(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
