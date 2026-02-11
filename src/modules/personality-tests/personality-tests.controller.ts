import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PersonalityTestsService } from './personality-tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  FindPersonalityTestsQueryDto,
  GetQuestionsQueryDto,
} from './dto/personality-tests.dto';

@ApiTags('Personality Tests')
@ApiBearerAuth()
@Controller('personality-tests')
@UseGuards(JwtAuthGuard)
export class PersonalityTestsController {
  constructor(
    private readonly personalityTestsService: PersonalityTestsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all personality tests',
    description: 'List personality tests with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Personality tests retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: FindPersonalityTestsQueryDto) {
    const result = await this.personalityTestsService.findAll({
      page: query.page,
      limit: query.limit,
      isActive: query.isActive,
    });
    return {
      success: true,
      data: result,
      message: 'Personality tests retrieved successfully',
    };
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get personality test categories',
    description:
      'Retrieve all available personality test categories (Big Five dimensions)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCategories() {
    const categories = await this.personalityTestsService.getCategories();
    return {
      success: true,
      data: categories,
      message: 'Categories retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get personality test by ID',
    description: 'Retrieve a specific personality test by its ID',
  })
  @ApiParam({ name: 'id', description: 'Personality test ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Personality test retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Personality test not found' })
  async findById(@Param('id') id: string) {
    const test = await this.personalityTestsService.findById(id);
    return {
      success: true,
      data: test,
      message: 'Personality test retrieved successfully',
    };
  }

  @Get(':id/questions')
  @ApiOperation({
    summary: 'Get personality test questions',
    description: 'Retrieve all questions for a specific personality test',
  })
  @ApiParam({ name: 'id', description: 'Personality test ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Personality test not found' })
  async getQuestions(
    @Param('id') id: string,
    @Query() query: GetQuestionsQueryDto,
  ) {
    const questions = await this.personalityTestsService.getQuestions(
      id,
      query.language || 'fr',
    );
    return {
      success: true,
      data: questions,
      message: 'Questions retrieved successfully',
    };
  }
}
