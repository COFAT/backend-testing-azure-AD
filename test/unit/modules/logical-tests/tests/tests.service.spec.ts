import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TestsService } from '@modules/logical-tests/tests/tests.service';
import { TranslationsService } from '@modules/logical-tests/translations/translations.service';
import { PrismaService } from '@shared/prisma/prisma.service';

// =============================================================================
// MOCK FACTORIES
// =============================================================================

const mockTest = {
  id: 'test-uuid-1',
  code: 'D_70',
  questionType: 'DOMINO',
  durationMinutes: 25,
  totalQuestions: 44,
  tutorialQuestions: 4,
  isTutorial: false,
  tutorialTestId: null,
  isActive: true,
  isOptional: false,
  version: 1,
  metadata: {},
  createdBy: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  translations: [
    {
      id: 'trans-1',
      testId: 'test-uuid-1',
      languageCode: 'fr',
      name: 'Test D-70',
      description: 'Test de dominos',
      instructions: 'Complétez la séquence',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  scoreClassifications: [
    {
      id: 'class-1',
      testId: 'test-uuid-1',
      displayOrder: 1,
      minScore: 0,
      maxScore: 20,
      colorCode: '#dc3545',
      createdAt: new Date(),
      updatedAt: new Date(),
      translations: [
        {
          id: 'class-trans-1',
          classificationId: 'class-1',
          languageCode: 'fr',
          label: 'Faible',
          description: 'Score faible',
          createdAt: new Date(),
        },
      ],
    },
  ],
};

const createMockPrisma = () => ({
  logicalTest: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  scoreClassification: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((operations) => {
    if (typeof operations === 'function') {
      return operations({
        scoreClassification: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({}),
        },
      });
    }
    return Promise.resolve(operations);
  }),
});

const createMockTranslationsService = () => ({
  validateLanguageCodes: jest.fn().mockResolvedValue(undefined),
  resolveLanguageCode: jest.fn().mockResolvedValue('fr'),
  getLanguages: jest.fn().mockResolvedValue([
    { code: 'fr', name: 'Français', isActive: true, isDefault: true },
    { code: 'en', name: 'English', isActive: true, isDefault: false },
  ]),
  getTestTranslations: jest.fn(),
  upsertTestTranslations: jest.fn(),
});

const createMockCacheManager = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

// =============================================================================
// TEST SUITE
// =============================================================================

describe('TestsService', () => {
  let service: TestsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let translationsService: ReturnType<typeof createMockTranslationsService>;
  let cacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    translationsService = createMockTranslationsService();
    cacheManager = createMockCacheManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TranslationsService, useValue: translationsService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<TestsService>(TestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // findAll
  // ===========================================================================

  describe('findAll', () => {
    it('should return paginated test list with translations', async () => {
      prisma.logicalTest.findMany.mockResolvedValue([mockTest]);
      prisma.logicalTest.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20, lang: 'fr' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test D-70');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply filters', async () => {
      prisma.logicalTest.findMany.mockResolvedValue([]);
      prisma.logicalTest.count.mockResolvedValue(0);

      await service.findAll({
        code: 'D_70',
        questionType: 'DOMINO',
        isActive: true,
        isTutorial: false,
      });

      expect(prisma.logicalTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            code: 'D_70',
            questionType: 'DOMINO',
            isActive: true,
            isTutorial: false,
          },
        }),
      );
    });

    it('should use defaults when no options provided', async () => {
      prisma.logicalTest.findMany.mockResolvedValue([]);
      prisma.logicalTest.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  // ===========================================================================
  // findOne
  // ===========================================================================

  describe('findOne', () => {
    it('should return test with translation for requested language', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      const result = await service.findOne('test-uuid-1', 'fr');

      expect(result.id).toBe('test-uuid-1');
      expect(result.name).toBe('Test D-70');
      expect(result.languageCode).toBe('fr');
    });

    it('should return cached data on cache hit', async () => {
      const cached = JSON.stringify({
        id: 'test-uuid-1',
        name: 'Cached Test',
      });
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.findOne('test-uuid-1', 'fr');

      expect(result.name).toBe('Cached Test');
      expect(prisma.logicalTest.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when test not found', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cache result after DB query', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      await service.findOne('test-uuid-1', 'fr');

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('logical:test:test-uuid-1:fr'),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should gracefully handle cache errors', async () => {
      cacheManager.get.mockRejectedValue(new Error('Redis down'));
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      const result = await service.findOne('test-uuid-1', 'fr');

      expect(result.id).toBe('test-uuid-1');
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    const createDto = {
      code: 'D_70',
      questionType: 'DOMINO',
      durationMinutes: 25,
      totalQuestions: 44,
      translations: [
        {
          languageCode: 'fr',
          name: 'Test D-70',
          instructions: 'Complétez la séquence',
        },
      ],
    };

    it('should create a test with translations', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null); // no existing
      prisma.logicalTest.create.mockResolvedValue(mockTest);

      const result = await service.create(createDto, 'user-uuid');

      expect(prisma.logicalTest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'D_70',
            questionType: 'DOMINO',
            durationMinutes: 25,
          }),
        }),
      );
      expect(result.id).toBe('test-uuid-1');
    });

    it('should throw ConflictException if test code+isTutorial already exists', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate tutorial test reference', async () => {
      prisma.logicalTest.findUnique
        .mockResolvedValueOnce(null) // code uniqueness check
        .mockResolvedValueOnce(null); // tutorial test not found

      const dto = { ...createDto, tutorialTestId: 'nonexistent-uuid' };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject non-tutorial test as tutorial reference', async () => {
      prisma.logicalTest.findUnique
        .mockResolvedValueOnce(null) // code uniqueness check
        .mockResolvedValueOnce({ ...mockTest, isTutorial: false }); // found but not tutorial

      const dto = { ...createDto, tutorialTestId: 'test-uuid-1' };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should validate language codes in translations', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);
      translationsService.validateLanguageCodes.mockRejectedValue(
        new BadRequestException('Invalid language codes: xx'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  // update
  // ===========================================================================

  describe('update', () => {
    it('should update test fields', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);
      prisma.logicalTest.update.mockResolvedValue({
        ...mockTest,
        durationMinutes: 30,
      });

      const result = await service.update('test-uuid-1', {
        durationMinutes: 30,
      });

      expect(prisma.logicalTest.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for unknown test', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { durationMinutes: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject self-referencing tutorial', async () => {
      prisma.logicalTest.findUnique
        .mockResolvedValueOnce(mockTest) // existing test
        .mockResolvedValueOnce({ ...mockTest, isTutorial: true }); // tutorial ref

      await expect(
        service.update('test-uuid-1', { tutorialTestId: 'test-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after update', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);
      prisma.logicalTest.update.mockResolvedValue(mockTest);

      await service.update('test-uuid-1', { isActive: false });

      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // remove
  // ===========================================================================

  describe('remove', () => {
    it('should delete a test with no attempts', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue({
        ...mockTest,
        _count: { attempts: 0 },
      });
      prisma.logicalTest.delete.mockResolvedValue(mockTest);

      const result = await service.remove('test-uuid-1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.logicalTest.delete).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1' },
      });
    });

    it('should throw NotFoundException for unknown test', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent deletion when attempts exist', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue({
        ...mockTest,
        _count: { attempts: 5 },
      });

      await expect(service.remove('test-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  // toggleActive
  // ===========================================================================

  describe('toggleActive', () => {
    it('should toggle active to inactive', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue({
        ...mockTest,
        isActive: true,
      });
      prisma.logicalTest.update.mockResolvedValue({
        ...mockTest,
        isActive: false,
      });

      const result = await service.toggleActive('test-uuid-1');

      expect(prisma.logicalTest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
      expect(result).toBeDefined();
    });

    it('should toggle inactive to active', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue({
        ...mockTest,
        isActive: false,
      });
      prisma.logicalTest.update.mockResolvedValue({
        ...mockTest,
        isActive: true,
      });

      await service.toggleActive('test-uuid-1');

      expect(prisma.logicalTest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: true },
        }),
      );
    });

    it('should throw NotFoundException for unknown test', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // getClassifications
  // ===========================================================================

  describe('getClassifications', () => {
    it('should return classifications with translated labels', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);
      prisma.scoreClassification.findMany.mockResolvedValue(
        mockTest.scoreClassifications,
      );

      const result = await service.getClassifications('test-uuid-1', 'fr');

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Faible');
      expect(result[0].minScore).toBe(0);
      expect(result[0].maxScore).toBe(20);
    });

    it('should return cached classifications', async () => {
      const cached = JSON.stringify([{ id: 'class-1', label: 'Cached Label' }]);
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getClassifications('test-uuid-1', 'fr');

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Cached Label');
    });

    it('should throw NotFoundException for unknown test', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(
        service.getClassifications('nonexistent', 'fr'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // upsertClassifications
  // ===========================================================================

  describe('upsertClassifications', () => {
    const classificationsDto = {
      classifications: [
        {
          displayOrder: 1,
          minScore: 0,
          maxScore: 20,
          colorCode: '#dc3545',
          translations: [
            {
              languageCode: 'fr',
              label: 'Faible',
              description: 'Score faible',
            },
          ],
        },
        {
          displayOrder: 2,
          minScore: 21,
          maxScore: 44,
          colorCode: '#28a745',
          translations: [
            {
              languageCode: 'fr',
              label: 'Très bien',
              description: 'Score élevé',
            },
          ],
        },
      ],
    };

    it('should upsert classifications in a transaction', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);
      prisma.scoreClassification.findMany.mockResolvedValue([]);

      await service.upsertClassifications('test-uuid-1', classificationsDto);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown test', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertClassifications('nonexistent', classificationsDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for overlapping ranges', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      const overlapping = {
        classifications: [
          {
            displayOrder: 1,
            minScore: 0,
            maxScore: 20,
            translations: [{ languageCode: 'fr', label: 'A' }],
          },
          {
            displayOrder: 2,
            minScore: 15, // overlaps with prev maxScore of 20
            maxScore: 44,
            translations: [{ languageCode: 'fr', label: 'B' }],
          },
        ],
      };

      await expect(
        service.upsertClassifications('test-uuid-1', overlapping),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when minScore > maxScore', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      const invalid = {
        classifications: [
          {
            displayOrder: 1,
            minScore: 30,
            maxScore: 10, // invalid: min > max
            translations: [{ languageCode: 'fr', label: 'A' }],
          },
        ],
      };

      await expect(
        service.upsertClassifications('test-uuid-1', invalid),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate language codes', async () => {
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);
      translationsService.validateLanguageCodes.mockRejectedValue(
        new BadRequestException('Invalid codes'),
      );

      await expect(
        service.upsertClassifications('test-uuid-1', classificationsDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // mapTestResponse (tested indirectly via findAll/findOne)
  // ===========================================================================

  describe('response mapping', () => {
    it('should fall back to first translation when requested lang not available', async () => {
      prisma.logicalTest.findMany.mockResolvedValue([mockTest]);
      prisma.logicalTest.count.mockResolvedValue(1);

      const result = await service.findAll({ lang: 'en' });

      // Falls back to 'fr' since only 'fr' translation exists
      expect(result.data[0].name).toBe('Test D-70');
      expect(result.data[0].languageCode).toBe('fr');
    });

    it('should include classifications in response', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.logicalTest.findUnique.mockResolvedValue(mockTest);

      const result = await service.findOne('test-uuid-1', 'fr');

      expect(result.classifications).toBeDefined();
      expect(result.classifications).toHaveLength(1);
      expect(result.classifications[0].label).toBe('Faible');
    });
  });
});
