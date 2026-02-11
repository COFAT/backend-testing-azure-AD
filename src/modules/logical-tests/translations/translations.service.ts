import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { DEFAULT_LANGUAGE_CODE } from '../shared/constants';
import {
  LogicalTestTranslationDto,
  LogicalQuestionTranslationDto,
  McqPropositionTranslationDto,
  ScoreClassificationTranslationDto,
  UpsertLanguageDto,
} from './dto';

/**
 * Handles all translation operations for the logical-tests module.
 *
 * Key feature: server-side fallback to the default language (fr)
 * when a requested translation is not available.
 */
@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // LANGUAGE MANAGEMENT
  // ============================================================================

  /**
   * Get all registered languages.
   */
  async getLanguages(activeOnly = true) {
    return this.prisma.language.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
  }

  /**
   * Get the default language code.
   */
  async getDefaultLanguageCode(): Promise<string> {
    const defaultLang = await this.prisma.language.findFirst({
      where: { isDefault: true },
      select: { code: true },
    });
    return defaultLang?.code ?? DEFAULT_LANGUAGE_CODE;
  }

  /**
   * Create or update a language entry.
   */
  async upsertLanguage(dto: UpsertLanguageDto) {
    return this.prisma.language.upsert({
      where: { code: dto.code },
      create: {
        code: dto.code,
        name: dto.name,
        isActive: true,
        isDefault: false,
      },
      update: {
        name: dto.name,
      },
    });
  }

  /**
   * Toggle language active status.
   */
  async toggleLanguageActive(code: string) {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });
    if (!language) {
      throw new NotFoundException(`Language "${code}" not found`);
    }
    if (language.isDefault) {
      throw new BadRequestException('Cannot deactivate the default language');
    }
    return this.prisma.language.update({
      where: { code },
      data: { isActive: !language.isActive },
    });
  }

  // ============================================================================
  // TRANSLATION FALLBACK LOGIC
  // ============================================================================

  /**
   * Resolve a language code: if the requested language has a translation,
   * use it; otherwise fall back to the default language.
   *
   * This is the core fallback mechanism used by all services.
   */
  async resolveLanguageCode(requestedLang: string): Promise<string> {
    const language = await this.prisma.language.findUnique({
      where: { code: requestedLang, isActive: true },
    });
    if (language) return requestedLang;

    this.logger.warn(
      `Language "${requestedLang}" not found or inactive, falling back to default`,
    );
    return this.getDefaultLanguageCode();
  }

  // ============================================================================
  // LOGICAL TEST TRANSLATIONS
  // ============================================================================

  /**
   * Get translation for a logical test in the requested language,
   * with fallback to default language.
   */
  async getTestTranslation(testId: string, requestedLang: string) {
    const lang = await this.resolveLanguageCode(requestedLang);

    let translation = await this.prisma.logicalTestTranslation.findUnique({
      where: { testId_languageCode: { testId, languageCode: lang } },
    });

    // Fallback to default language if requested language translation doesn't exist
    if (!translation && lang !== DEFAULT_LANGUAGE_CODE) {
      this.logger.debug(
        `No "${lang}" translation for test ${testId}, falling back to "${DEFAULT_LANGUAGE_CODE}"`,
      );
      translation = await this.prisma.logicalTestTranslation.findUnique({
        where: {
          testId_languageCode: {
            testId,
            languageCode: DEFAULT_LANGUAGE_CODE,
          },
        },
      });
    }

    return translation;
  }

  /**
   * Get all translations for a logical test.
   */
  async getTestTranslations(testId: string) {
    return this.prisma.logicalTestTranslation.findMany({
      where: { testId },
      include: { language: true },
      orderBy: { languageCode: 'asc' },
    });
  }

  /**
   * Create or update translations for a logical test.
   * Uses upsert to handle both create and update in one operation.
   */
  async upsertTestTranslations(
    testId: string,
    translations: LogicalTestTranslationDto[],
  ) {
    await this.validateLanguageCodes(translations.map((t) => t.languageCode));

    const operations = translations.map((t) =>
      this.prisma.logicalTestTranslation.upsert({
        where: {
          testId_languageCode: { testId, languageCode: t.languageCode },
        },
        create: {
          testId,
          languageCode: t.languageCode,
          name: t.name,
          description: t.description,
          instructions: t.instructions,
        },
        update: {
          name: t.name,
          description: t.description,
          instructions: t.instructions,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  /**
   * Delete a specific translation for a logical test.
   */
  async deleteTestTranslation(testId: string, languageCode: string) {
    await this.ensureNotDeletingDefaultTranslation(
      'logicalTestTranslation',
      testId,
      languageCode,
    );

    return this.prisma.logicalTestTranslation.delete({
      where: {
        testId_languageCode: { testId, languageCode },
      },
    });
  }

  // ============================================================================
  // SCORE CLASSIFICATION TRANSLATIONS
  // ============================================================================

  /**
   * Get translation for a score classification with fallback.
   */
  async getClassificationTranslation(
    classificationId: string,
    requestedLang: string,
  ) {
    const lang = await this.resolveLanguageCode(requestedLang);

    let translation =
      await this.prisma.scoreClassificationTranslation.findUnique({
        where: {
          classificationId_languageCode: {
            classificationId,
            languageCode: lang,
          },
        },
      });

    if (!translation && lang !== DEFAULT_LANGUAGE_CODE) {
      translation = await this.prisma.scoreClassificationTranslation.findUnique(
        {
          where: {
            classificationId_languageCode: {
              classificationId,
              languageCode: DEFAULT_LANGUAGE_CODE,
            },
          },
        },
      );
    }

    return translation;
  }

  /**
   * Get all translations for classifications of a test.
   */
  async getClassificationTranslations(classificationId: string) {
    return this.prisma.scoreClassificationTranslation.findMany({
      where: { classificationId },
      include: { language: true },
      orderBy: { languageCode: 'asc' },
    });
  }

  /**
   * Create or update translations for a score classification.
   */
  async upsertClassificationTranslations(
    classificationId: string,
    translations: ScoreClassificationTranslationDto[],
  ) {
    await this.validateLanguageCodes(translations.map((t) => t.languageCode));

    const operations = translations.map((t) =>
      this.prisma.scoreClassificationTranslation.upsert({
        where: {
          classificationId_languageCode: {
            classificationId,
            languageCode: t.languageCode,
          },
        },
        create: {
          classificationId,
          languageCode: t.languageCode,
          label: t.label,
          description: t.description,
        },
        update: {
          label: t.label,
          description: t.description,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  // ============================================================================
  // LOGICAL QUESTION TRANSLATIONS
  // ============================================================================

  /**
   * Get translation for a question with fallback.
   */
  async getQuestionTranslation(questionId: string, requestedLang: string) {
    const lang = await this.resolveLanguageCode(requestedLang);

    let translation = await this.prisma.logicalQuestionTranslation.findUnique({
      where: {
        questionId_languageCode: { questionId, languageCode: lang },
      },
    });

    if (!translation && lang !== DEFAULT_LANGUAGE_CODE) {
      translation = await this.prisma.logicalQuestionTranslation.findUnique({
        where: {
          questionId_languageCode: {
            questionId,
            languageCode: DEFAULT_LANGUAGE_CODE,
          },
        },
      });
    }

    return translation;
  }

  /**
   * Get all translations for a question.
   */
  async getQuestionTranslations(questionId: string) {
    return this.prisma.logicalQuestionTranslation.findMany({
      where: { questionId },
      include: { language: true },
      orderBy: { languageCode: 'asc' },
    });
  }

  /**
   * Create or update translations for a question.
   */
  async upsertQuestionTranslations(
    questionId: string,
    translations: LogicalQuestionTranslationDto[],
  ) {
    await this.validateLanguageCodes(translations.map((t) => t.languageCode));

    const operations = translations.map((t) =>
      this.prisma.logicalQuestionTranslation.upsert({
        where: {
          questionId_languageCode: {
            questionId,
            languageCode: t.languageCode,
          },
        },
        create: {
          questionId,
          languageCode: t.languageCode,
          title: t.title,
          instruction: t.instruction,
          hints: t.hints ?? [],
        },
        update: {
          title: t.title,
          instruction: t.instruction,
          hints: t.hints ?? [],
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  /**
   * Delete a specific translation for a question.
   */
  async deleteQuestionTranslation(questionId: string, languageCode: string) {
    await this.ensureNotDeletingDefaultTranslation(
      'logicalQuestionTranslation',
      questionId,
      languageCode,
    );

    return this.prisma.logicalQuestionTranslation.delete({
      where: {
        questionId_languageCode: { questionId, languageCode },
      },
    });
  }

  // ============================================================================
  // MCQ PROPOSITION TRANSLATIONS
  // ============================================================================

  /**
   * Get translation for a proposition with fallback.
   */
  async getPropositionTranslation(
    propositionId: string,
    requestedLang: string,
  ) {
    const lang = await this.resolveLanguageCode(requestedLang);

    let translation = await this.prisma.mcqPropositionTranslation.findUnique({
      where: {
        propositionId_languageCode: {
          propositionId,
          languageCode: lang,
        },
      },
    });

    if (!translation && lang !== DEFAULT_LANGUAGE_CODE) {
      translation = await this.prisma.mcqPropositionTranslation.findUnique({
        where: {
          propositionId_languageCode: {
            propositionId,
            languageCode: DEFAULT_LANGUAGE_CODE,
          },
        },
      });
    }

    return translation;
  }

  /**
   * Get all translations for propositions of an MCQ question.
   */
  async getPropositionTranslations(propositionId: string) {
    return this.prisma.mcqPropositionTranslation.findMany({
      where: { propositionId },
      include: { language: true },
      orderBy: { languageCode: 'asc' },
    });
  }

  /**
   * Create or update translations for an MCQ proposition.
   */
  async upsertPropositionTranslations(
    propositionId: string,
    translations: McqPropositionTranslationDto[],
  ) {
    await this.validateLanguageCodes(translations.map((t) => t.languageCode));

    const operations = translations.map((t) =>
      this.prisma.mcqPropositionTranslation.upsert({
        where: {
          propositionId_languageCode: {
            propositionId,
            languageCode: t.languageCode,
          },
        },
        create: {
          propositionId,
          languageCode: t.languageCode,
          text: t.text,
        },
        update: {
          text: t.text,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  // ============================================================================
  // BULK OPERATIONS (for question creation with translations)
  // ============================================================================

  /**
   * Get translations for multiple questions at once (batch operation).
   * Used when loading all questions for a test.
   */
  async getQuestionTranslationsBatch(
    questionIds: string[],
    requestedLang: string,
  ) {
    const lang = await this.resolveLanguageCode(requestedLang);

    const translations = await this.prisma.logicalQuestionTranslation.findMany({
      where: {
        questionId: { in: questionIds },
        languageCode: lang,
      },
    });

    // Check if we need fallback for any missing translations
    const foundIds = new Set(translations.map((t) => t.questionId));
    const missingIds = questionIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0 && lang !== DEFAULT_LANGUAGE_CODE) {
      const fallbackTranslations =
        await this.prisma.logicalQuestionTranslation.findMany({
          where: {
            questionId: { in: missingIds },
            languageCode: DEFAULT_LANGUAGE_CODE,
          },
        });
      translations.push(...fallbackTranslations);
    }

    // Return as a map for easy lookup
    const translationMap = new Map<string, (typeof translations)[0]>();
    for (const t of translations) {
      // Don't overwrite if we already have the requested language
      if (!translationMap.has(t.questionId) || t.languageCode === lang) {
        translationMap.set(t.questionId, t);
      }
    }

    return translationMap;
  }

  /**
   * Get translations for multiple propositions at once (batch operation).
   * Used when loading MCQ propositions for a question.
   */
  async getPropositionTranslationsBatch(
    propositionIds: string[],
    requestedLang: string,
  ) {
    const lang = await this.resolveLanguageCode(requestedLang);

    const translations = await this.prisma.mcqPropositionTranslation.findMany({
      where: {
        propositionId: { in: propositionIds },
        languageCode: lang,
      },
    });

    const foundIds = new Set(translations.map((t) => t.propositionId));
    const missingIds = propositionIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0 && lang !== DEFAULT_LANGUAGE_CODE) {
      const fallbackTranslations =
        await this.prisma.mcqPropositionTranslation.findMany({
          where: {
            propositionId: { in: missingIds },
            languageCode: DEFAULT_LANGUAGE_CODE,
          },
        });
      translations.push(...fallbackTranslations);
    }

    const translationMap = new Map<string, (typeof translations)[0]>();
    for (const t of translations) {
      if (!translationMap.has(t.propositionId) || t.languageCode === lang) {
        translationMap.set(t.propositionId, t);
      }
    }

    return translationMap;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate that all provided language codes exist and are active.
   */
  async validateLanguageCodes(codes: string[]): Promise<void> {
    const uniqueCodes = [...new Set(codes)];
    const languages = await this.prisma.language.findMany({
      where: { code: { in: uniqueCodes }, isActive: true },
      select: { code: true },
    });

    const foundCodes = new Set(languages.map((l) => l.code));
    const invalidCodes = uniqueCodes.filter((c) => !foundCodes.has(c));

    if (invalidCodes.length > 0) {
      throw new BadRequestException(
        `Invalid or inactive language codes: ${invalidCodes.join(', ')}`,
      );
    }
  }

  /**
   * Prevent deleting the only remaining translation (the default language one)
   * to ensure at least one translation always exists.
   */
  private async ensureNotDeletingDefaultTranslation(
    model:
      | 'logicalTestTranslation'
      | 'logicalQuestionTranslation'
      | 'mcqPropositionTranslation',
    parentId: string,
    languageCode: string,
  ): Promise<void> {
    const defaultLang = await this.getDefaultLanguageCode();

    if (languageCode === defaultLang) {
      // Check if there are other translations
      let count: number;
      switch (model) {
        case 'logicalTestTranslation':
          count = await this.prisma.logicalTestTranslation.count({
            where: { testId: parentId },
          });
          break;
        case 'logicalQuestionTranslation':
          count = await this.prisma.logicalQuestionTranslation.count({
            where: { questionId: parentId },
          });
          break;
        case 'mcqPropositionTranslation':
          count = await this.prisma.mcqPropositionTranslation.count({
            where: { propositionId: parentId },
          });
          break;
      }

      if (count <= 1) {
        throw new BadRequestException(
          'Cannot delete the last remaining translation. At least one translation must exist.',
        );
      }
    }
  }
}
