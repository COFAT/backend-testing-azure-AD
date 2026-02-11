import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TranslationsService } from '@modules/logical-tests/translations/translations.service';
import { PrismaService } from '@shared/prisma/prisma.service';

// ============================================================================
// MOCK PRISMA SERVICE
// ============================================================================

const mockPrismaService = () => ({
  language: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  logicalTestTranslation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  scoreClassificationTranslation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  logicalQuestionTranslation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  mcqPropositionTranslation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((operations) => Promise.all(operations)),
});

describe('TranslationsService', () => {
  let service: TranslationsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TranslationsService>(TranslationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LANGUAGE MANAGEMENT
  // ============================================================================

  describe('getLanguages', () => {
    it('should return only active languages by default', async () => {
      const languages = [
        { code: 'fr', name: 'Français', isActive: true, isDefault: true },
        { code: 'en', name: 'English', isActive: true, isDefault: false },
      ];
      prisma.language.findMany.mockResolvedValue(languages);

      const result = await service.getLanguages();

      expect(prisma.language.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      });
      expect(result).toEqual(languages);
    });

    it('should return all languages when activeOnly is false', async () => {
      prisma.language.findMany.mockResolvedValue([]);

      await service.getLanguages(false);

      expect(prisma.language.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      });
    });
  });

  describe('getDefaultLanguageCode', () => {
    it('should return the default language code from DB', async () => {
      prisma.language.findFirst.mockResolvedValue({ code: 'fr' });

      const result = await service.getDefaultLanguageCode();

      expect(result).toBe('fr');
    });

    it('should fallback to "fr" if no default language is set', async () => {
      prisma.language.findFirst.mockResolvedValue(null);

      const result = await service.getDefaultLanguageCode();

      expect(result).toBe('fr');
    });
  });

  describe('upsertLanguage', () => {
    it('should create or update a language', async () => {
      const dto = { code: 'ar', name: 'العربية' };
      const expected = { ...dto, isActive: true, isDefault: false };
      prisma.language.upsert.mockResolvedValue(expected);

      const result = await service.upsertLanguage(dto);

      expect(prisma.language.upsert).toHaveBeenCalledWith({
        where: { code: 'ar' },
        create: {
          code: 'ar',
          name: 'العربية',
          isActive: true,
          isDefault: false,
        },
        update: { name: 'العربية' },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('toggleLanguageActive', () => {
    it('should toggle an active language to inactive', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
        isDefault: false,
      });
      prisma.language.update.mockResolvedValue({
        code: 'en',
        isActive: false,
        isDefault: false,
      });

      const result = await service.toggleLanguageActive('en');

      expect(prisma.language.update).toHaveBeenCalledWith({
        where: { code: 'en' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for unknown language', async () => {
      prisma.language.findUnique.mockResolvedValue(null);

      await expect(service.toggleLanguageActive('xx')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when toggling default language', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'fr',
        isActive: true,
        isDefault: true,
      });

      await expect(service.toggleLanguageActive('fr')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // TRANSLATION FALLBACK LOGIC
  // ============================================================================

  describe('resolveLanguageCode', () => {
    it('should return the requested language if it is active', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });

      const result = await service.resolveLanguageCode('en');

      expect(result).toBe('en');
    });

    it('should fall back to default language if requested is not found', async () => {
      prisma.language.findUnique.mockResolvedValue(null);
      prisma.language.findFirst.mockResolvedValue({ code: 'fr' });

      const result = await service.resolveLanguageCode('de');

      expect(result).toBe('fr');
    });
  });

  // ============================================================================
  // LOGICAL TEST TRANSLATIONS
  // ============================================================================

  describe('getTestTranslation', () => {
    const testId = 'test-uuid-1';

    it('should return translation in the requested language', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });
      const translation = {
        id: 'trans-1',
        testId,
        languageCode: 'en',
        name: 'D-70 Test',
        instructions: 'Complete the dominos',
      };
      prisma.logicalTestTranslation.findUnique.mockResolvedValue(translation);

      const result = await service.getTestTranslation(testId, 'en');

      expect(result).toEqual(translation);
    });

    it('should fall back to default language when requested translation is missing', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });

      // First call: requested language - not found
      prisma.logicalTestTranslation.findUnique
        .mockResolvedValueOnce(null)
        // Second call: default language - found
        .mockResolvedValueOnce({
          id: 'trans-fr',
          testId,
          languageCode: 'fr',
          name: 'Test D-70',
          instructions: 'Complétez les dominos',
        });

      const result = await service.getTestTranslation(testId, 'en');

      expect(result?.languageCode).toBe('fr');
      expect(prisma.logicalTestTranslation.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should return null if no translation exists at all', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });
      prisma.logicalTestTranslation.findUnique.mockResolvedValue(null);

      const result = await service.getTestTranslation(testId, 'en');

      expect(result).toBeNull();
    });
  });

  describe('upsertTestTranslations', () => {
    const testId = 'test-uuid-1';

    it('should upsert translations in a transaction', async () => {
      prisma.language.findMany.mockResolvedValue([
        { code: 'fr' },
        { code: 'en' },
      ]);
      prisma.logicalTestTranslation.upsert
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce({ id: '2' });

      const translations = [
        {
          languageCode: 'fr',
          name: 'Test D-70',
          instructions: 'Instructions FR',
        },
        {
          languageCode: 'en',
          name: 'D-70 Test',
          instructions: 'Instructions EN',
        },
      ];

      await service.upsertTestTranslations(testId, translations);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.logicalTestTranslation.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for invalid language codes', async () => {
      prisma.language.findMany.mockResolvedValue([{ code: 'fr' }]);

      const translations = [
        {
          languageCode: 'xx',
          name: 'Test',
          instructions: 'Inst',
        },
      ];

      await expect(
        service.upsertTestTranslations(testId, translations),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTestTranslation', () => {
    const testId = 'test-uuid-1';

    it('should delete a non-default translation', async () => {
      prisma.language.findFirst.mockResolvedValue({ code: 'fr' });
      prisma.logicalTestTranslation.delete.mockResolvedValue({
        id: 'trans-en',
      });

      await service.deleteTestTranslation(testId, 'en');

      expect(prisma.logicalTestTranslation.delete).toHaveBeenCalledWith({
        where: { testId_languageCode: { testId, languageCode: 'en' } },
      });
    });

    it('should throw BadRequestException when deleting the last translation', async () => {
      prisma.language.findFirst.mockResolvedValue({ code: 'fr' });
      prisma.logicalTestTranslation.count.mockResolvedValue(1);

      await expect(service.deleteTestTranslation(testId, 'fr')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow deleting default language translation if others exist', async () => {
      prisma.language.findFirst.mockResolvedValue({ code: 'fr' });
      prisma.logicalTestTranslation.count.mockResolvedValue(2);
      prisma.logicalTestTranslation.delete.mockResolvedValue({
        id: 'trans-fr',
      });

      await service.deleteTestTranslation(testId, 'fr');

      expect(prisma.logicalTestTranslation.delete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // QUESTION TRANSLATIONS
  // ============================================================================

  describe('getQuestionTranslation', () => {
    const questionId = 'question-uuid-1';

    it('should return question translation in requested language', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'fr',
        isActive: true,
      });
      const translation = {
        id: 'qt-1',
        questionId,
        languageCode: 'fr',
        instruction: 'Trouvez le domino manquant',
        hints: ['Indice 1'],
      };
      prisma.logicalQuestionTranslation.findUnique.mockResolvedValue(
        translation,
      );

      const result = await service.getQuestionTranslation(questionId, 'fr');

      expect(result).toEqual(translation);
    });

    it('should fall back to default language for missing question translation', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });
      prisma.logicalQuestionTranslation.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'qt-fr',
          questionId,
          languageCode: 'fr',
          instruction: 'Instruction FR',
        });

      const result = await service.getQuestionTranslation(questionId, 'en');

      expect(result?.languageCode).toBe('fr');
    });
  });

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  describe('getQuestionTranslationsBatch', () => {
    it('should return translations map for all question IDs', async () => {
      const questionIds = ['q1', 'q2', 'q3'];
      prisma.language.findUnique.mockResolvedValue({
        code: 'fr',
        isActive: true,
      });

      prisma.logicalQuestionTranslation.findMany.mockResolvedValue([
        { questionId: 'q1', languageCode: 'fr', instruction: 'Inst 1' },
        { questionId: 'q2', languageCode: 'fr', instruction: 'Inst 2' },
        { questionId: 'q3', languageCode: 'fr', instruction: 'Inst 3' },
      ]);

      const result = await service.getQuestionTranslationsBatch(
        questionIds,
        'fr',
      );

      expect(result.size).toBe(3);
      expect(result.get('q1')?.instruction).toBe('Inst 1');
    });

    it('should use fallback for missing translations in batch', async () => {
      const questionIds = ['q1', 'q2'];
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });

      // First call: English translations - only q1 found
      prisma.logicalQuestionTranslation.findMany
        .mockResolvedValueOnce([
          { questionId: 'q1', languageCode: 'en', instruction: 'Inst EN' },
        ])
        // Second call: French fallback for q2
        .mockResolvedValueOnce([
          { questionId: 'q2', languageCode: 'fr', instruction: 'Inst FR' },
        ]);

      const result = await service.getQuestionTranslationsBatch(
        questionIds,
        'en',
      );

      expect(result.size).toBe(2);
      expect(result.get('q1')?.languageCode).toBe('en');
      expect(result.get('q2')?.languageCode).toBe('fr');
    });
  });

  describe('getPropositionTranslationsBatch', () => {
    it('should return translations map for all proposition IDs', async () => {
      const propositionIds = ['p1', 'p2'];
      prisma.language.findUnique.mockResolvedValue({
        code: 'fr',
        isActive: true,
      });

      prisma.mcqPropositionTranslation.findMany.mockResolvedValue([
        { propositionId: 'p1', languageCode: 'fr', text: 'Prop 1' },
        { propositionId: 'p2', languageCode: 'fr', text: 'Prop 2' },
      ]);

      const result = await service.getPropositionTranslationsBatch(
        propositionIds,
        'fr',
      );

      expect(result.size).toBe(2);
      expect(result.get('p1')?.text).toBe('Prop 1');
    });

    it('should fall back to default for missing proposition translations', async () => {
      const propositionIds = ['p1', 'p2'];
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });

      prisma.mcqPropositionTranslation.findMany
        .mockResolvedValueOnce([
          { propositionId: 'p1', languageCode: 'en', text: 'Prop EN' },
        ])
        .mockResolvedValueOnce([
          { propositionId: 'p2', languageCode: 'fr', text: 'Prop FR' },
        ]);

      const result = await service.getPropositionTranslationsBatch(
        propositionIds,
        'en',
      );

      expect(result.size).toBe(2);
      expect(result.get('p1')?.languageCode).toBe('en');
      expect(result.get('p2')?.languageCode).toBe('fr');
    });
  });

  // ============================================================================
  // SCORE CLASSIFICATION TRANSLATIONS
  // ============================================================================

  describe('getClassificationTranslation', () => {
    const classificationId = 'class-uuid-1';

    it('should return classification translation', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'fr',
        isActive: true,
      });
      const translation = {
        id: 'ct-1',
        classificationId,
        languageCode: 'fr',
        label: 'Très bien',
      };
      prisma.scoreClassificationTranslation.findUnique.mockResolvedValue(
        translation,
      );

      const result = await service.getClassificationTranslation(
        classificationId,
        'fr',
      );

      expect(result).toEqual(translation);
    });

    it('should fall back for missing classification translation', async () => {
      prisma.language.findUnique.mockResolvedValue({
        code: 'en',
        isActive: true,
      });
      prisma.scoreClassificationTranslation.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'ct-fr',
          classificationId,
          languageCode: 'fr',
          label: 'Très bien',
        });

      const result = await service.getClassificationTranslation(
        classificationId,
        'en',
      );

      expect(result?.languageCode).toBe('fr');
    });
  });

  describe('upsertClassificationTranslations', () => {
    it('should upsert classification translations in a transaction', async () => {
      const classificationId = 'class-uuid-1';
      prisma.language.findMany.mockResolvedValue([{ code: 'fr' }]);
      prisma.scoreClassificationTranslation.upsert.mockResolvedValue({
        id: '1',
      });

      await service.upsertClassificationTranslations(classificationId, [
        { languageCode: 'fr', label: 'Très bien' },
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(
        prisma.scoreClassificationTranslation.upsert,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
