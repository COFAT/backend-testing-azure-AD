/**
 * Constants for logical tests module.
 */

/** Default language code used as fallback when requested translation is missing. */
export const DEFAULT_LANGUAGE_CODE = 'fr';

/** Supported logical test codes. Must match the LogicalTestCode Prisma enum. */
export const LOGICAL_TEST_CODES = [
  'D_70',
  'D_2000',
  'LOGIQUE_PROPOSITIONS',
] as const;
export type LogicalTestCodeType = (typeof LOGICAL_TEST_CODES)[number];

/** Supported question types. Must match the LogicalQuestionType Prisma enum. */
export const LOGICAL_QUESTION_TYPES = ['DOMINO', 'MCQ'] as const;
export type LogicalQuestionTypeValue = (typeof LOGICAL_QUESTION_TYPES)[number];

/** MCQ proposition choices. Must match the PropositionChoice Prisma enum. */
export const PROPOSITION_CHOICES = ['TRUE', 'FALSE', 'UNKNOWN'] as const;
export type PropositionChoiceValue = (typeof PROPOSITION_CHOICES)[number];

/** Redis key patterns for logical tests caching. */
export const REDIS_KEYS = {
  /** Test with translations: logical:test:{testId}:{lang} */
  test: (testId: string, lang: string) => `logical:test:${testId}:${lang}`,
  /** Test list: logical:tests:list:{hash} */
  testList: (hash: string) => `logical:tests:list:${hash}`,
  /** Questions for candidate: logical:test:{testId}:questions:{lang} */
  questions: (testId: string, lang: string) =>
    `logical:test:${testId}:questions:${lang}`,
  /** Attempt progress: logical:attempt:{attemptId}:progress */
  attemptProgress: (attemptId: string) =>
    `logical:attempt:${attemptId}:progress`,
  /** Score classifications: logical:test:{testId}:classifications:{lang} */
  classifications: (testId: string, lang: string) =>
    `logical:test:${testId}:classifications:${lang}`,
} as const;

/** Cache TTLs in seconds. */
export const CACHE_TTL = {
  /** Test details: 1 hour */
  TEST: 3600,
  /** Test list: 5 minutes */
  TEST_LIST: 300,
  /** Questions: 1 hour */
  QUESTIONS: 3600,
  /** Attempt progress: 4 hours */
  ATTEMPT_PROGRESS: 14400,
  /** Score classifications: 24 hours */
  CLASSIFICATIONS: 86400,
} as const;
