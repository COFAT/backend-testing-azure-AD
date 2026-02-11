-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'psychologue', 'candidate');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending_verification', 'pending_profile', 'active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "CandidatureStatus" AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'in_review', 'evaluated', 'archived');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "LogicalTestType" AS ENUM ('domino', 'multiple_choice');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('easy', 'medium', 'hard', 'expert');

-- CreateEnum
CREATE TYPE "ScoringType" AS ENUM ('FORWARD', 'REVERSE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('started', 'in_progress', 'completed', 'timed_out', 'abandoned');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('favorable', 'defavorable');

-- CreateEnum
CREATE TYPE "ReportLanguage" AS ENUM ('fr', 'en');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('immediately', 'one_week', 'two_weeks', 'one_month');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('headquarters', 'research_development', 'production', 'regional_office');

-- CreateEnum
CREATE TYPE "ScoreClassificationLabel" AS ENUM ('tres_bien', 'bien', 'assez_bien', 'moyenne', 'assez_moyenne', 'faible', 'tres_faible');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "site_type" "SiteType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "gender" "Gender",
    "date_of_birth" DATE,
    "phone" VARCHAR(20),
    "address" VARCHAR(500),
    "profile_picture_url" VARCHAR(500),
    "current_situation" VARCHAR(200),
    "education_level" VARCHAR(100),
    "target_position" VARCHAR(100),
    "availability" DATE,
    "role" "UserRole" NOT NULL DEFAULT 'candidate',
    "status" "UserStatus" NOT NULL DEFAULT 'pending_verification',
    "site_id" UUID,
    "department_id" UUID,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "purpose" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "desired_position" VARCHAR(100) NOT NULL,
    "current_position" VARCHAR(100),
    "education_level" VARCHAR(100),
    "availability" "Availability" NOT NULL DEFAULT 'immediately',
    "motivation" TEXT,
    "cv_url" VARCHAR(500),
    "additional_info" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_application_id" UUID NOT NULL,
    "assigned_psychologue_id" UUID,
    "assigned_by" UUID,
    "dp_number" VARCHAR(50),
    "status" "CandidatureStatus" NOT NULL DEFAULT 'pending',
    "assigned_logical_test_id" UUID,
    "assigned_personality_test_id" UUID,
    "assigned_optional_logical_test_id" UUID,
    "assignment_date" TIMESTAMPTZ,
    "exam_date" TIMESTAMPTZ,
    "decision" "DecisionType",
    "decision_date" TIMESTAMPTZ,
    "decision_by" UUID,
    "decision_comments" TEXT,
    "previous_candidature_id" UUID,
    "is_reevaluation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidature_id" UUID NOT NULL,
    "interview_date" TIMESTAMPTZ NOT NULL,
    "interviewer_name" VARCHAR(200) NOT NULL,
    "decision" "DecisionType" NOT NULL,
    "notes" TEXT,
    "conducted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidature_state_transitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidature_id" UUID NOT NULL,
    "from_status" "CandidatureStatus",
    "to_status" "CandidatureStatus" NOT NULL,
    "transitioned_by" UUID NOT NULL,
    "transitioned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "candidature_state_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logical_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "type" "LogicalTestType" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'medium',
    "is_tutorial" BOOLEAN NOT NULL DEFAULT false,
    "tutorial_test_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analytics" JSONB NOT NULL DEFAULT '{"attempts": 0, "avgScore": 0, "completionRate": 0}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logical_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_classifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "test_id" UUID NOT NULL,
    "label" "ScoreClassificationLabel" NOT NULL,
    "display_order" INTEGER NOT NULL,
    "min_score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "interpretation_fr" TEXT NOT NULL,
    "interpretation_en" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logical_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "test_id" UUID NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question_type" VARCHAR(50) NOT NULL,
    "title" JSONB,
    "instruction" JSONB NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'medium',
    "domino_layout" JSONB,
    "arrows" JSONB,
    "correct_answer" JSONB,
    "layout_type" VARCHAR(50),
    "propositions" JSONB,
    "hints" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "analytics" JSONB NOT NULL DEFAULT '{"correctRate": 0, "avgTimeSpent": 0}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logical_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logical_test_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidature_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "tutorial_attempt_id" UUID,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "time_spent_ms" BIGINT,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "percentage_score" DECIMAL(5,2),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "proposition_metrics" JSONB,
    "ai_classification" JSONB,
    "manual_classification" JSONB,
    "ai_comment" TEXT,
    "ai_comment_at" TIMESTAMPTZ,
    "psychologist_comment" TEXT,
    "psychologist_comment_by" UUID,
    "psychologist_comment_at" TIMESTAMPTZ,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "device" VARCHAR(50),
    "browser" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logical_test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logical_question_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "domino_answer" JSONB,
    "proposition_responses" JSONB,
    "is_correct" BOOLEAN,
    "is_half_correct" BOOLEAN NOT NULL DEFAULT false,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 1,
    "answer_changes" INTEGER NOT NULL DEFAULT 0,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "events" JSONB NOT NULL DEFAULT '[]',
    "first_visit_at" TIMESTAMPTZ,
    "last_visit_at" TIMESTAMPTZ,
    "answered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logical_question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL DEFAULT 240,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "analytics" JSONB NOT NULL DEFAULT '{"attempts": 0, "avgCompletionTime": 0}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "description" JSONB,
    "scoring_ranges" JSONB NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_facets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "description" JSONB,
    "scoring_ranges" JSONB NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_facets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "facet_id" UUID NOT NULL,
    "test_id" UUID,
    "display_order" INTEGER NOT NULL,
    "global_order" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "text" VARCHAR(500),
    "scoring_type" "ScoringType" NOT NULL DEFAULT 'FORWARD',
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_test_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidature_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "preferred_language" "ReportLanguage" NOT NULL DEFAULT 'fr',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "time_elapsed_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" "AttemptStatus" NOT NULL DEFAULT 'started',
    "completion_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_saved_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "psychologist_comment" TEXT,
    "psychologist_comment_by" UUID,
    "psychologist_comment_at" TIMESTAMPTZ,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_value" INTEGER NOT NULL,
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_draft_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_value" INTEGER NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_draft_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_facet_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "facet_id" UUID NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "max_possible_score" INTEGER NOT NULL DEFAULT 32,
    "percentile" DECIMAL(5,2),

    CONSTRAINT "personality_facet_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_category_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "max_possible_score" INTEGER NOT NULL DEFAULT 192,
    "percentile" DECIMAL(5,2),

    CONSTRAINT "personality_category_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_validation_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "honesty_response" INTEGER,
    "answered_all" BOOLEAN,
    "responses_correctly_placed" BOOLEAN,
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_validation_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidature_id" UUID NOT NULL,
    "language" "ReportLanguage" NOT NULL DEFAULT 'fr',
    "content" JSONB NOT NULL,
    "pdf_url" VARCHAR(500),
    "pdf_generated_at" TIMESTAMPTZ,
    "generated_by" UUID NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'generated',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changes" JSONB,
    "performed_by" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'email',
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "attempt_type" VARCHAR(20) NOT NULL,
    "candidate_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "checkpoint_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_name_idx" ON "sites"("name");

-- CreateIndex
CREATE INDEX "sites_code_idx" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_country_idx" ON "sites"("country");

-- CreateIndex
CREATE INDEX "sites_is_active_idx" ON "sites"("is_active");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_code_idx" ON "departments"("code");

-- CreateIndex
CREATE INDEX "site_departments_site_id_idx" ON "site_departments"("site_id");

-- CreateIndex
CREATE INDEX "site_departments_department_id_idx" ON "site_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_departments_site_id_department_id_key" ON "site_departments"("site_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_site_id_idx" ON "users"("site_id");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "otp_codes_user_id_purpose_idx" ON "otp_codes"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_code_purpose_idx" ON "otp_codes"("code", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_hash_idx" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "job_applications_candidate_id_idx" ON "job_applications"("candidate_id");

-- CreateIndex
CREATE INDEX "job_applications_site_id_idx" ON "job_applications"("site_id");

-- CreateIndex
CREATE INDEX "job_applications_department_id_idx" ON "job_applications"("department_id");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "job_applications_status_created_at_idx" ON "job_applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "job_applications_candidate_id_status_idx" ON "job_applications"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "job_applications_reviewed_by_idx" ON "job_applications"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_job_application_id_key" ON "candidatures"("job_application_id");

-- CreateIndex
CREATE INDEX "candidatures_job_application_id_idx" ON "candidatures"("job_application_id");

-- CreateIndex
CREATE INDEX "candidatures_assigned_psychologue_id_idx" ON "candidatures"("assigned_psychologue_id");

-- CreateIndex
CREATE INDEX "candidatures_status_idx" ON "candidatures"("status");

-- CreateIndex
CREATE INDEX "candidatures_status_created_at_idx" ON "candidatures"("status", "created_at");

-- CreateIndex
CREATE INDEX "candidatures_assigned_psychologue_id_status_created_at_idx" ON "candidatures"("assigned_psychologue_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "candidatures_status_exam_date_idx" ON "candidatures"("status", "exam_date");

-- CreateIndex
CREATE INDEX "candidatures_exam_date_idx" ON "candidatures"("exam_date");

-- CreateIndex
CREATE INDEX "candidatures_dp_number_idx" ON "candidatures"("dp_number");

-- CreateIndex
CREATE UNIQUE INDEX "technical_interviews_candidature_id_key" ON "technical_interviews"("candidature_id");

-- CreateIndex
CREATE INDEX "technical_interviews_candidature_id_idx" ON "technical_interviews"("candidature_id");

-- CreateIndex
CREATE INDEX "technical_interviews_interview_date_idx" ON "technical_interviews"("interview_date");

-- CreateIndex
CREATE INDEX "technical_interviews_decision_idx" ON "technical_interviews"("decision");

-- CreateIndex
CREATE INDEX "candidature_state_transitions_candidature_id_transitioned_a_idx" ON "candidature_state_transitions"("candidature_id", "transitioned_at");

-- CreateIndex
CREATE INDEX "candidature_state_transitions_transitioned_by_idx" ON "candidature_state_transitions"("transitioned_by");

-- CreateIndex
CREATE INDEX "candidature_state_transitions_to_status_idx" ON "candidature_state_transitions"("to_status");

-- CreateIndex
CREATE INDEX "logical_tests_name_idx" ON "logical_tests"("name");

-- CreateIndex
CREATE INDEX "logical_tests_type_idx" ON "logical_tests"("type");

-- CreateIndex
CREATE INDEX "logical_tests_is_active_idx" ON "logical_tests"("is_active");

-- CreateIndex
CREATE INDEX "logical_tests_is_tutorial_idx" ON "logical_tests"("is_tutorial");

-- CreateIndex
CREATE INDEX "score_classifications_test_id_idx" ON "score_classifications"("test_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_classifications_test_id_label_key" ON "score_classifications"("test_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "score_classifications_test_id_display_order_key" ON "score_classifications"("test_id", "display_order");

-- CreateIndex
CREATE INDEX "logical_questions_test_id_idx" ON "logical_questions"("test_id");

-- CreateIndex
CREATE INDEX "logical_questions_question_type_idx" ON "logical_questions"("question_type");

-- CreateIndex
CREATE INDEX "logical_questions_difficulty_idx" ON "logical_questions"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "logical_questions_test_id_question_number_key" ON "logical_questions"("test_id", "question_number");

-- CreateIndex
CREATE INDEX "logical_test_attempts_candidature_id_idx" ON "logical_test_attempts"("candidature_id");

-- CreateIndex
CREATE INDEX "logical_test_attempts_test_id_idx" ON "logical_test_attempts"("test_id");

-- CreateIndex
CREATE INDEX "logical_test_attempts_status_idx" ON "logical_test_attempts"("status");

-- CreateIndex
CREATE INDEX "logical_test_attempts_submitted_at_idx" ON "logical_test_attempts"("submitted_at");

-- CreateIndex
CREATE INDEX "logical_test_attempts_candidature_id_test_id_status_idx" ON "logical_test_attempts"("candidature_id", "test_id", "status");

-- CreateIndex
CREATE INDEX "logical_question_responses_attempt_id_idx" ON "logical_question_responses"("attempt_id");

-- CreateIndex
CREATE INDEX "logical_question_responses_question_id_idx" ON "logical_question_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "logical_question_responses_attempt_id_question_id_key" ON "logical_question_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "personality_tests_name_idx" ON "personality_tests"("name");

-- CreateIndex
CREATE INDEX "personality_tests_is_active_idx" ON "personality_tests"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "personality_categories_name_key" ON "personality_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "personality_categories_code_key" ON "personality_categories"("code");

-- CreateIndex
CREATE INDEX "personality_categories_name_idx" ON "personality_categories"("name");

-- CreateIndex
CREATE INDEX "personality_categories_code_idx" ON "personality_categories"("code");

-- CreateIndex
CREATE INDEX "personality_categories_display_order_idx" ON "personality_categories"("display_order");

-- CreateIndex
CREATE INDEX "personality_facets_category_id_idx" ON "personality_facets"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_facets_category_id_display_order_key" ON "personality_facets"("category_id", "display_order");

-- CreateIndex
CREATE INDEX "personality_questions_facet_id_idx" ON "personality_questions"("facet_id");

-- CreateIndex
CREATE INDEX "personality_questions_test_id_idx" ON "personality_questions"("test_id");

-- CreateIndex
CREATE INDEX "personality_questions_global_order_idx" ON "personality_questions"("global_order");

-- CreateIndex
CREATE UNIQUE INDEX "personality_questions_facet_id_display_order_key" ON "personality_questions"("facet_id", "display_order");

-- CreateIndex
CREATE INDEX "personality_test_attempts_candidature_id_idx" ON "personality_test_attempts"("candidature_id");

-- CreateIndex
CREATE INDEX "personality_test_attempts_test_id_idx" ON "personality_test_attempts"("test_id");

-- CreateIndex
CREATE INDEX "personality_test_attempts_status_idx" ON "personality_test_attempts"("status");

-- CreateIndex
CREATE INDEX "personality_test_attempts_submitted_at_idx" ON "personality_test_attempts"("submitted_at");

-- CreateIndex
CREATE INDEX "personality_test_attempts_candidature_id_test_id_status_idx" ON "personality_test_attempts"("candidature_id", "test_id", "status");

-- CreateIndex
CREATE INDEX "personality_answers_attempt_id_idx" ON "personality_answers"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_answers_attempt_id_question_id_key" ON "personality_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "personality_draft_answers_attempt_id_idx" ON "personality_draft_answers"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_draft_answers_attempt_id_question_id_key" ON "personality_draft_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "personality_facet_scores_attempt_id_idx" ON "personality_facet_scores"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_facet_scores_attempt_id_facet_id_key" ON "personality_facet_scores"("attempt_id", "facet_id");

-- CreateIndex
CREATE INDEX "personality_category_scores_attempt_id_idx" ON "personality_category_scores"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_category_scores_attempt_id_category_id_key" ON "personality_category_scores"("attempt_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "personality_validation_responses_attempt_id_key" ON "personality_validation_responses"("attempt_id");

-- CreateIndex
CREATE INDEX "reports_candidature_id_idx" ON "reports"("candidature_id");

-- CreateIndex
CREATE INDEX "reports_generated_at_idx" ON "reports"("generated_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_checkpoints_attempt_id_key" ON "attempt_checkpoints"("attempt_id");

-- CreateIndex
CREATE INDEX "attempt_checkpoints_attempt_id_idx" ON "attempt_checkpoints"("attempt_id");

-- CreateIndex
CREATE INDEX "attempt_checkpoints_candidate_id_idx" ON "attempt_checkpoints"("candidate_id");

-- CreateIndex
CREATE INDEX "attempt_checkpoints_updated_at_idx" ON "attempt_checkpoints"("updated_at");

-- AddForeignKey
ALTER TABLE "site_departments" ADD CONSTRAINT "site_departments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_departments" ADD CONSTRAINT "site_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_job_application_id_fkey" FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_assigned_psychologue_id_fkey" FOREIGN KEY ("assigned_psychologue_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_decision_by_fkey" FOREIGN KEY ("decision_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_assigned_logical_test_id_fkey" FOREIGN KEY ("assigned_logical_test_id") REFERENCES "logical_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_assigned_personality_test_id_fkey" FOREIGN KEY ("assigned_personality_test_id") REFERENCES "personality_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_assigned_optional_logical_test_id_fkey" FOREIGN KEY ("assigned_optional_logical_test_id") REFERENCES "logical_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_previous_candidature_id_fkey" FOREIGN KEY ("previous_candidature_id") REFERENCES "candidatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_interviews" ADD CONSTRAINT "technical_interviews_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_interviews" ADD CONSTRAINT "technical_interviews_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidature_state_transitions" ADD CONSTRAINT "candidature_state_transitions_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidature_state_transitions" ADD CONSTRAINT "candidature_state_transitions_transitioned_by_fkey" FOREIGN KEY ("transitioned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_tests" ADD CONSTRAINT "logical_tests_tutorial_test_id_fkey" FOREIGN KEY ("tutorial_test_id") REFERENCES "logical_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_tests" ADD CONSTRAINT "logical_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_classifications" ADD CONSTRAINT "score_classifications_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "logical_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_questions" ADD CONSTRAINT "logical_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "logical_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_test_attempts" ADD CONSTRAINT "logical_test_attempts_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_test_attempts" ADD CONSTRAINT "logical_test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "logical_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_test_attempts" ADD CONSTRAINT "logical_test_attempts_tutorial_attempt_id_fkey" FOREIGN KEY ("tutorial_attempt_id") REFERENCES "logical_test_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_test_attempts" ADD CONSTRAINT "logical_test_attempts_psychologist_comment_by_fkey" FOREIGN KEY ("psychologist_comment_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_question_responses" ADD CONSTRAINT "logical_question_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "logical_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logical_question_responses" ADD CONSTRAINT "logical_question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "logical_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_tests" ADD CONSTRAINT "personality_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_categories" ADD CONSTRAINT "personality_categories_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_facets" ADD CONSTRAINT "personality_facets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "personality_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_facets" ADD CONSTRAINT "personality_facets_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_questions" ADD CONSTRAINT "personality_questions_facet_id_fkey" FOREIGN KEY ("facet_id") REFERENCES "personality_facets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_questions" ADD CONSTRAINT "personality_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "personality_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_questions" ADD CONSTRAINT "personality_questions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_test_attempts" ADD CONSTRAINT "personality_test_attempts_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_test_attempts" ADD CONSTRAINT "personality_test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "personality_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_test_attempts" ADD CONSTRAINT "personality_test_attempts_psychologist_comment_by_fkey" FOREIGN KEY ("psychologist_comment_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_test_attempts" ADD CONSTRAINT "personality_test_attempts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_answers" ADD CONSTRAINT "personality_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "personality_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_answers" ADD CONSTRAINT "personality_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "personality_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_draft_answers" ADD CONSTRAINT "personality_draft_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "personality_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_draft_answers" ADD CONSTRAINT "personality_draft_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "personality_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_facet_scores" ADD CONSTRAINT "personality_facet_scores_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "personality_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_facet_scores" ADD CONSTRAINT "personality_facet_scores_facet_id_fkey" FOREIGN KEY ("facet_id") REFERENCES "personality_facets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_category_scores" ADD CONSTRAINT "personality_category_scores_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "personality_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_category_scores" ADD CONSTRAINT "personality_category_scores_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "personality_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_validation_responses" ADD CONSTRAINT "personality_validation_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "personality_test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_checkpoints" ADD CONSTRAINT "attempt_checkpoints_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
