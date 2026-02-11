import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '@shared/prisma/prisma.service';
import { TranslationsService } from '../translations/translations.service';
import { REDIS_KEYS, CACHE_TTL } from '../shared/constants';
import { CreateTestDto } from './dto/create-test.dto';
import { CreateTutorialTestDto } from './dto/create-tutorial-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import {
  ScoreClassificationItemDto,
  UpsertClassificationsDto,
} from './dto/classification.dto';
import type {
  LogicalTestCode,
  LogicalQuestionType,
  Prisma,
} from '@prisma/client';

/**
 * Service handling CRUD operations for logical tests,
 * score classifications, and Redis caching.
 */
@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationsService: TranslationsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ============================================================================
  // TEST CRUD
  // ============================================================================

  /**
   * List all tests with optional filters.
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    code?: string;
    questionType?: string;
    isActive?: boolean;
    isTutorial?: boolean;
    lang?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      code,
      questionType,
      isActive,
      isTutorial,
      lang = 'fr',
    } = options ?? {};

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (code) where.code = code;
    if (questionType) where.questionType = questionType;
    if (isActive !== undefined) where.isActive = isActive;
    if (isTutorial !== undefined) where.isTutorial = isTutorial;

    const [tests, total] = await Promise.all([
      this.prisma.logicalTest.findMany({
        where,
        skip,
        take: limit,
        include: {
          translations: true,
          scoreClassifications: {
            include: { translations: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: [{ code: 'asc' }, { isTutorial: 'asc' }],
      }),
      this.prisma.logicalTest.count({ where }),
    ]);

    const data = tests.map((test) => this.mapTestResponse(test, lang));

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
   * Get a single test by ID with full details.
   */
  async findOne(id: string, lang = 'fr') {
    // Try cache first
    const cacheKey = REDIS_KEYS.test(id, lang);
    try {
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for test ${id} (${lang})`);
        return JSON.parse(cached);
      }
    } catch {
      this.logger.warn('Cache read failed, falling back to DB');
    }

    const test = await this.prisma.logicalTest.findUnique({
      where: { id },
      include: {
        translations: true,
        scoreClassifications: {
          include: { translations: true },
          orderBy: { displayOrder: 'asc' },
        },
        tutorialTest: {
          include: { translations: true },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID "${id}" not found`);
    }

    const response = this.mapTestResponse(test, lang);

    // Cache the response
    try {
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(response),
        CACHE_TTL.TEST * 1000,
      );
    } catch {
      this.logger.warn('Cache write failed');
    }

    return response;
  }

  /**
   * Create a new logical test with translations.
   */
  async create(dto: CreateTestDto, createdBy?: string) {
    // Validate uniqueness of code + isTutorial combination
    const existing = await this.prisma.logicalTest.findUnique({
      where: {
        code_isTutorial: {
          code: dto.code as LogicalTestCode,
          isTutorial: dto.isTutorial ?? false,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A ${dto.isTutorial ? 'tutorial' : 'main'} test with code "${dto.code}" already exists`,
      );
    }

    // Validate tutorial test reference
    if (dto.tutorialTestId) {
      const tutorialTest = await this.prisma.logicalTest.findUnique({
        where: { id: dto.tutorialTestId },
      });
      if (!tutorialTest) {
        throw new BadRequestException(
          `Tutorial test with ID "${dto.tutorialTestId}" not found`,
        );
      }
      if (!tutorialTest.isTutorial) {
        throw new BadRequestException('Referenced test is not a tutorial test');
      }
    }

    // Validate language codes for translations
    await this.translationsService.validateLanguageCodes(
      dto.translations.map((t) => t.languageCode),
    );

    const test = await this.prisma.logicalTest.create({
      data: {
        code: dto.code as LogicalTestCode,
        questionType: dto.questionType as LogicalQuestionType,
        durationMinutes: dto.durationMinutes,
        totalQuestions: dto.totalQuestions,
        tutorialQuestions: dto.tutorialQuestions ?? 0,
        isTutorial: dto.isTutorial ?? false,
        tutorialTestId: dto.tutorialTestId,
        isActive: dto.isActive ?? true,
        isOptional: dto.isOptional ?? false,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdBy,
        translations: {
          create: dto.translations.map((t) => ({
            languageCode: t.languageCode,
            name: t.name,
            description: t.description,
            instructions: t.instructions,
          })),
        },
      },
      include: {
        translations: true,
        scoreClassifications: {
          include: { translations: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.invalidateTestListCache();

    return this.mapTestResponse(
      test,
      dto.translations[0]?.languageCode ?? 'fr',
    );
  }

  /**
   * Update an existing logical test.
   */
  async update(id: string, dto: UpdateTestDto) {
    const existing = await this.prisma.logicalTest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Test with ID "${id}" not found`);
    }

    // Validate tutorial test reference if provided
    if (dto.tutorialTestId) {
      const tutorialTest = await this.prisma.logicalTest.findUnique({
        where: { id: dto.tutorialTestId },
      });
      if (!tutorialTest) {
        throw new BadRequestException(
          `Tutorial test with ID "${dto.tutorialTestId}" not found`,
        );
      }
      if (!tutorialTest.isTutorial) {
        throw new BadRequestException('Referenced test is not a tutorial test');
      }
      if (dto.tutorialTestId === id) {
        throw new BadRequestException(
          'A test cannot reference itself as its tutorial',
        );
      }
    }

    const updateData: Prisma.LogicalTestUpdateInput = {};
    if (dto.durationMinutes !== undefined)
      updateData.durationMinutes = dto.durationMinutes;
    if (dto.totalQuestions !== undefined)
      updateData.totalQuestions = dto.totalQuestions;
    if (dto.tutorialQuestions !== undefined)
      updateData.tutorialQuestions = dto.tutorialQuestions;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isOptional !== undefined) updateData.isOptional = dto.isOptional;
    if (dto.version !== undefined) updateData.version = dto.version;
    if (dto.metadata !== undefined)
      updateData.metadata = dto.metadata as Prisma.InputJsonValue;
    if (dto.tutorialTestId !== undefined) {
      updateData.tutorialTest = dto.tutorialTestId
        ? { connect: { id: dto.tutorialTestId } }
        : { disconnect: true };
    }

    const test = await this.prisma.logicalTest.update({
      where: { id },
      data: updateData,
      include: {
        translations: true,
        scoreClassifications: {
          include: { translations: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.invalidateTestCache(id);

    return this.mapTestResponse(test, 'fr');
  }

  /**
   * Delete a test (hard delete — only if no attempts exist).
   */
  async remove(id: string) {
    const test = await this.prisma.logicalTest.findUnique({
      where: { id },
      include: { _count: { select: { attempts: true } } },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID "${id}" not found`);
    }

    if (test._count.attempts > 0) {
      throw new BadRequestException(
        `Cannot delete test "${id}" — it has ${test._count.attempts} attempt(s). Deactivate it instead.`,
      );
    }

    await this.prisma.logicalTest.delete({ where: { id } });

    await this.invalidateTestCache(id);

    return { deleted: true };
  }

  /**
   * Toggle the isActive flag on a test.
   */
  async toggleActive(id: string) {
    const test = await this.prisma.logicalTest.findUnique({
      where: { id },
    });
    if (!test) {
      throw new NotFoundException(`Test with ID "${id}" not found`);
    }

    const updated = await this.prisma.logicalTest.update({
      where: { id },
      data: { isActive: !test.isActive },
      include: {
        translations: true,
        scoreClassifications: {
          include: { translations: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.invalidateTestCache(id);

    return this.mapTestResponse(updated, 'fr');
  }

  /**
   * Create a tutorial test linked to an existing main test.
   */
  async createTutorialTest(
    mainTestId: string,
    dto: CreateTutorialTestDto,
    createdBy?: string,
  ) {
    const mainTest = await this.prisma.logicalTest.findUnique({
      where: { id: mainTestId },
    });

    if (!mainTest) {
      throw new NotFoundException(`Test with ID "${mainTestId}" not found`);
    }

    if (mainTest.isTutorial) {
      throw new BadRequestException(
        'Cannot create a tutorial test from another tutorial test',
      );
    }

    if (mainTest.tutorialTestId) {
      throw new ConflictException(
        `Tutorial test already exists for main test "${mainTestId}"`,
      );
    }

    const existingTutorial = await this.prisma.logicalTest.findUnique({
      where: {
        code_isTutorial: {
          code: mainTest.code,
          isTutorial: true,
        },
      },
    });

    if (existingTutorial) {
      throw new ConflictException(
        `Tutorial test already exists for code "${mainTest.code}"`,
      );
    }

    await this.translationsService.validateLanguageCodes(
      dto.translations.map((t) => t.languageCode),
    );

    const durationMinutes = dto.durationMinutes ?? mainTest.durationMinutes;
    const totalQuestions = dto.totalQuestions ?? mainTest.totalQuestions;

    const { tutorial } = await this.prisma.$transaction(async (tx) => {
      const tutorial = await tx.logicalTest.create({
        data: {
          code: mainTest.code,
          questionType: mainTest.questionType,
          durationMinutes,
          totalQuestions,
          tutorialQuestions: 0,
          isTutorial: true,
          tutorialTestId: null,
          isActive: dto.isActive ?? true,
          isOptional: dto.isOptional ?? false,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          createdBy,
          translations: {
            create: dto.translations.map((t) => ({
              languageCode: t.languageCode,
              name: t.name,
              description: t.description,
              instructions: t.instructions,
            })),
          },
        },
        include: {
          translations: true,
          scoreClassifications: {
            include: { translations: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      await tx.logicalTest.update({
        where: { id: mainTestId },
        data: { tutorialTest: { connect: { id: tutorial.id } } },
      });

      return { tutorial };
    });

    await Promise.all([
      this.invalidateTestCache(mainTestId),
      this.invalidateTestCache(tutorial.id),
    ]);

    return this.mapTestResponse(
      tutorial,
      dto.translations[0]?.languageCode ?? 'fr',
    );
  }

  // ============================================================================
  // SCORE CLASSIFICATIONS
  // ============================================================================

  /**
   * Get score classifications for a test, with translations in the requested language.
   */
  async getClassifications(testId: string, lang = 'fr') {
    // Try cache first
    const cacheKey = REDIS_KEYS.classifications(testId, lang);
    try {
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      this.logger.warn('Cache read failed for classifications');
    }

    const test = await this.prisma.logicalTest.findUnique({
      where: { id: testId },
    });
    if (!test) {
      throw new NotFoundException(`Test with ID "${testId}" not found`);
    }

    const classifications = await this.prisma.scoreClassification.findMany({
      where: { testId },
      include: { translations: true },
      orderBy: { displayOrder: 'asc' },
    });

    const resolvedLang =
      await this.translationsService.resolveLanguageCode(lang);

    const result = classifications.map((c) => {
      const translation =
        c.translations.find((t) => t.languageCode === resolvedLang) ??
        c.translations.find((t) => t.languageCode === 'fr') ??
        c.translations[0];

      return {
        id: c.id,
        displayOrder: c.displayOrder,
        minScore: c.minScore,
        maxScore: c.maxScore,
        colorCode: c.colorCode,
        label: translation?.label,
        description: translation?.description,
      };
    });

    // Cache
    try {
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(result),
        CACHE_TTL.CLASSIFICATIONS * 1000,
      );
    } catch {
      this.logger.warn('Cache write failed for classifications');
    }

    return result;
  }

  /**
   * Upsert score classifications for a test.
   * Replaces the entire set: existing classifications not in the input are deleted.
   */
  async upsertClassifications(testId: string, dto: UpsertClassificationsDto) {
    const test = await this.prisma.logicalTest.findUnique({
      where: { id: testId },
    });
    if (!test) {
      throw new NotFoundException(`Test with ID "${testId}" not found`);
    }

    // Validate score ranges don't overlap
    this.validateClassificationRanges(dto.classifications);

    // Validate all language codes used in translations
    const allLangCodes = dto.classifications.flatMap((c) =>
      c.translations.map((t) => t.languageCode),
    );
    await this.translationsService.validateLanguageCodes(allLangCodes);

    // Execute in a transaction: delete old + create new
    await this.prisma.$transaction(async (tx) => {
      // Delete existing classifications (cascades to translations)
      await tx.scoreClassification.deleteMany({
        where: { testId },
      });

      // Create new classifications with translations
      for (const item of dto.classifications) {
        await tx.scoreClassification.create({
          data: {
            testId,
            displayOrder: item.displayOrder,
            minScore: item.minScore,
            maxScore: item.maxScore,
            colorCode: item.colorCode,
            translations: {
              create: item.translations.map((t) => ({
                languageCode: t.languageCode,
                label: t.label,
                description: t.description,
              })),
            },
          },
        });
      }
    });

    // Invalidate classification cache for all languages
    await this.invalidateTestCache(testId);

    return this.getClassifications(testId, 'fr');
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map a raw Prisma test object to the API response shape,
   * selecting the best translation for the requested language.
   */
  private mapTestResponse(
    test: {
      id: string;
      code: string;
      questionType: string;
      durationMinutes: number;
      totalQuestions: number;
      tutorialQuestions: number;
      isTutorial: boolean;
      tutorialTestId: string | null;
      isActive: boolean;
      isOptional: boolean;
      version: number;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
      translations?: Array<{
        languageCode: string;
        name: string;
        description: string | null;
        instructions: string;
      }>;
      scoreClassifications?: Array<{
        id: string;
        displayOrder: number;
        minScore: number;
        maxScore: number;
        colorCode: string | null;
        translations: Array<{
          languageCode: string;
          label: string;
          description: string | null;
        }>;
      }>;
    },
    lang: string,
  ) {
    // Pick the best translation for the requested language
    const translation =
      test.translations?.find((t) => t.languageCode === lang) ??
      test.translations?.find((t) => t.languageCode === 'fr') ??
      test.translations?.[0];

    // Map classifications with translations
    const classifications = test.scoreClassifications?.map((c) => {
      const classTranslation =
        c.translations.find((t) => t.languageCode === lang) ??
        c.translations.find((t) => t.languageCode === 'fr') ??
        c.translations[0];

      return {
        id: c.id,
        displayOrder: c.displayOrder,
        minScore: c.minScore,
        maxScore: c.maxScore,
        colorCode: c.colorCode,
        label: classTranslation?.label,
        description: classTranslation?.description,
      };
    });

    return {
      id: test.id,
      code: test.code,
      questionType: test.questionType,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
      tutorialQuestions: test.tutorialQuestions,
      isTutorial: test.isTutorial,
      tutorialTestId: test.tutorialTestId,
      isActive: test.isActive,
      isOptional: test.isOptional,
      version: test.version,
      metadata: test.metadata,
      name: translation?.name,
      description: translation?.description,
      instructions: translation?.instructions,
      languageCode: translation?.languageCode,
      ...(classifications && classifications.length > 0
        ? { classifications }
        : {}),
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  }

  /**
   * Validate that classification score ranges don't overlap
   * and are ordered consistently.
   */
  private validateClassificationRanges(
    classifications: ScoreClassificationItemDto[],
  ) {
    const sorted = [...classifications].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

    for (const c of sorted) {
      if (c.minScore > c.maxScore) {
        throw new BadRequestException(
          `Classification at displayOrder ${c.displayOrder}: minScore (${c.minScore}) cannot be greater than maxScore (${c.maxScore})`,
        );
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (curr.minScore <= prev.maxScore) {
        throw new BadRequestException(
          `Score range overlap between displayOrder ${prev.displayOrder} (${prev.minScore}-${prev.maxScore}) and ${curr.displayOrder} (${curr.minScore}-${curr.maxScore})`,
        );
      }
    }
  }

  /**
   * Invalidate all cache keys related to a specific test.
   */
  private async invalidateTestCache(testId: string) {
    try {
      // Invalidate all language variants for this test
      const languages = await this.translationsService.getLanguages(false);
      const keys = languages.flatMap((l) => [
        REDIS_KEYS.test(testId, l.code),
        REDIS_KEYS.classifications(testId, l.code),
        REDIS_KEYS.questions(testId, l.code),
      ]);

      await Promise.all(keys.map((key) => this.cacheManager.del(key)));
      await this.invalidateTestListCache();
    } catch {
      this.logger.warn('Cache invalidation failed');
    }
  }

  /**
   * Invalidate the test list cache.
   * Since the list cache uses hashed query params, we just
   * delete the known patterns. In a production system you'd
   * use a more sophisticated key-scanning or tagging approach.
   */
  private async invalidateTestListCache() {
    // Simple approach: we won't try to scan Redis keys,
    // list cache has a short TTL (5 min) so it will expire naturally.
    // For explicit invalidation, we could store known list keys in a set.
    this.logger.debug('Test list cache will expire naturally (5 min TTL)');
  }
}
