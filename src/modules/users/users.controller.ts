import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';
import { FindUsersQueryDto } from './dto/users.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================================================
  // CURRENT USER ENDPOINTS (/users/me/*)
  // ============================================================================

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.getMe(user.id);
    return {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully',
    };
  }

  @Put('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return {
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    };
  }

  @Put('me/complete-profile')
  @ApiOperation({
    summary: 'Complete candidate profile',
    description:
      'Complete profile after OTP verification. Changes status to active.',
  })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Profile can only be completed when status is pending_profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: CompleteProfileDto,
  ) {
    const profile = await this.usersService.completeProfile(user.id, dto);
    return {
      success: true,
      data: profile,
      message: 'Profile completed successfully',
    };
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload profile photo',
    description: 'Upload or update profile photo. Max 2MB. JPEG, PNG, WebP.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile photo file',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadPhoto(
    @CurrentUser() user: { id: string },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.usersService.uploadProfilePhoto(user.id, file);
    return {
      success: true,
      data: result,
      message: 'Profile photo uploaded successfully',
    };
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Create user (Admin)',
    description:
      'Create a new user with a temporary password. Password format: COFAT-{FirstName}{4RandomChars}',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully with temporary password',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async createUser(@Body() dto: CreateUserDto) {
    const result = await this.usersService.adminCreateUser(dto);
    return {
      user: result.user,
      temporaryPassword: result.temporaryPassword,
      emailSent: result.emailSent,
      message: result.emailSent
        ? 'User created successfully. Credentials have been sent via email.'
        : 'User created successfully. No email sent.',
    };
  }

  @Get()
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get all users',
    description: 'List users with pagination and filters',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAll({
      page: query.page,
      limit: query.limit,
      role: query.role as UserRole | undefined,
      status: query.status as UserStatus | undefined,
      search: query.search,
    });
    return {
      success: true,
      data: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.psychologue)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Psychologue role required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }
}
