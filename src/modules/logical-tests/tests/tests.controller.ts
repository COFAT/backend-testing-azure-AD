import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { TestsService } from './tests.service';
import { TranslationsService } from '../translations/translations.service';
import { CreateTestDto } from './dto/create-test.dto';
import { CreateTutorialTestDto } from './dto/create-tutorial-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { UpsertClassificationsDto } from './dto/classification.dto';
import { UpsertTestTranslationsDto } from '../translations/dto';

@ApiTags('Logical Tests')
@ApiBearerAuth()
@Controller('logical-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly translationsService: TranslationsService,
  ) {}

  // ============================================================================
  // TEST CRUD
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List all logical tests (with filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'code',
    required: false,
    enum: ['D_70', 'D_2000', 'LOGIQUE_PROPOSITIONS'],
  })
  @ApiQuery({
    name: 'questionType',
    required: false,
    enum: ['DOMINO', 'MCQ'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isTutorial', required: false, type: Boolean })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language code for translations (default: fr)',
  })
  @Roles('admin', 'psychologue')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('code') code?: string,
    @Query('questionType') questionType?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('isTutorial', new ParseBoolPipe({ optional: true }))
    isTutorial?: boolean,
    @Query('lang') lang?: string,
  ) {
    return this.testsService.findAll({
      page,
      limit,
      code,
      questionType,
      isActive,
      isTutorial,
      lang,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a logical test by ID' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language code for translations (default: fr)',
  })
  @Roles('admin', 'psychologue')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang?: string,
  ) {
    return this.testsService.findOne(id, lang);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new logical test' })
  @Roles('admin')
  async create(
    @Body() dto: CreateTestDto,
    @Request() req: { user?: { id?: string } },
  ) {
    return this.testsService.create(dto, req.user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a logical test' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestDto,
  ) {
    return this.testsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a logical test (only if no attempts)' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle test active status' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin')
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.toggleActive(id);
  }

  @Post(':id/tutorial')
  @ApiOperation({ summary: 'Create a tutorial test for a main test' })
  @ApiParam({ name: 'id', description: 'Main test UUID' })
  @Roles('admin')
  async createTutorialTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTutorialTestDto,
    @Request() req: { user?: { id?: string } },
  ) {
    return this.testsService.createTutorialTest(id, dto, req.user?.id);
  }

  // ============================================================================
  // TRANSLATIONS (inline — managed per test)
  // ============================================================================

  @Get(':id/translations')
  @ApiOperation({ summary: 'Get all translations for a test' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin', 'psychologue')
  async getTranslations(@Param('id', ParseUUIDPipe) id: string) {
    return this.translationsService.getTestTranslations(id);
  }

  @Post(':id/translations')
  @ApiOperation({ summary: 'Add or update translations for a test' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin')
  async upsertTranslations(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTestTranslationsDto,
  ) {
    // Verify test exists
    await this.testsService.findOne(id);
    return this.translationsService.upsertTestTranslations(
      id,
      dto.translations,
    );
  }

  // ============================================================================
  // SCORE CLASSIFICATIONS
  // ============================================================================

  @Get(':id/classifications')
  @ApiOperation({ summary: 'Get score classifications for a test' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language code (default: fr)',
  })
  @Roles('admin', 'psychologue')
  async getClassifications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang?: string,
  ) {
    return this.testsService.getClassifications(id, lang);
  }

  @Post(':id/classifications')
  @ApiOperation({ summary: 'Upsert score classifications for a test' })
  @ApiParam({ name: 'id', description: 'Test UUID' })
  @Roles('admin')
  async upsertClassifications(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertClassificationsDto,
  ) {
    return this.testsService.upsertClassifications(id, dto);
  }
}
