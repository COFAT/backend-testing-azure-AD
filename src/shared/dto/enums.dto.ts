/**
 * Shared enums for DTOs
 * These mirror Prisma enums but are safe for Swagger documentation
 */

// ============================================================================
// USER ENUMS
// ============================================================================

export enum UserRoleDto {
  admin = 'admin',
  psychologue = 'psychologue',
  candidate = 'candidate',
}

export enum UserStatusDto {
  pending_verification = 'pending_verification',
  pending_profile = 'pending_profile',
  active = 'active',
  suspended = 'suspended',
  inactive = 'inactive',
}

export enum GenderDto {
  Male = 'Male',
  Female = 'Female',
}

// ============================================================================
// CANDIDATURE ENUMS
// ============================================================================

export enum CandidatureStatusDto {
  pending = 'pending',
  assigned = 'assigned',
  in_progress = 'in_progress',
  completed = 'completed',
  in_review = 'in_review',
  evaluated = 'evaluated',
  archived = 'archived',
}

export enum DecisionTypeDto {
  favorable = 'favorable',
  defavorable = 'defavorable',
}

export enum DataEntryMethodDto {
  platform = 'platform',
  legacy_manual = 'legacy_manual',
}

// ============================================================================
// TEST ENUMS
// ============================================================================

export enum LogicalTestTypeDto {
  D_70 = 'D_70',
  D_2000 = 'D_2000',
}

export enum AttemptStatusDto {
  started = 'started',
  in_progress = 'in_progress',
  completed = 'completed',
  timed_out = 'timed_out',
  abandoned = 'abandoned',
}

// ============================================================================
// REPORT ENUMS
// ============================================================================

export enum ReportLanguageDto {
  fr = 'fr',
  en = 'en',
}
