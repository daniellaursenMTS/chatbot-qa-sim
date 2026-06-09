-- CreateEnum
CREATE TYPE "WebhookMethod" AS ENUM ('POST', 'PUT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('CREATED', 'RUNNING', 'EVALUATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'CHATBOT');

-- CreateEnum
CREATE TYPE "MessageGenerationSource" AS ENUM ('INITIAL', 'FOLLOW_UP', 'WEBHOOK_REPLY');

-- CreateEnum
CREATE TYPE "Criterion" AS ENUM ('ACCURACY', 'COMPLETENESS', 'HELPFULNESS', 'TONE', 'RELEVANCE', 'HALLUCINATION');

-- CreateEnum
CREATE TYPE "CriterionStatus" AS ENUM ('PASS', 'WARNING', 'FAIL');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('ACCURACY', 'COMPLETENESS', 'HELPFULNESS', 'TONE', 'RELEVANCE', 'HALLUCINATION');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('MARKDOWN', 'PDF');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('CREATED', 'FAILED');

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" "WebhookMethod" NOT NULL DEFAULT 'POST',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "skillFocus" TEXT NOT NULL,
    "ecommerceContext" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_runs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'CREATED',
    "webhookConfigId" TEXT,
    "webhookConfigSnapshot" JSONB NOT NULL,
    "chatbotName" TEXT NOT NULL,
    "chatbotPurpose" TEXT NOT NULL,
    "testScenario" TEXT NOT NULL,
    "ecommerceCategory" TEXT,
    "initialQuestionCount" INTEGER NOT NULL,
    "followUpQuestionCount" INTEGER NOT NULL,
    "targetBotResponseCount" INTEGER NOT NULL,
    "openaiModel" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_run_personas" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "personaId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "personaSnapshot" JSONB NOT NULL,

    CONSTRAINT "simulation_run_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "personaRunId" TEXT,
    "role" "MessageRole" NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generationSource" "MessageGenerationSource",
    "webhookRequestPayload" JSONB,
    "webhookResponsePayload" JSONB,
    "webhookStatusCode" INTEGER,
    "webhookLatencyMs" INTEGER,
    "webhookError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "summary" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criterion_results" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "personaRunId" TEXT,
    "criterion" "Criterion" NOT NULL,
    "status" "CriterionStatus" NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT,
    "relatedMessageIds" JSONB NOT NULL,
    "relatedMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_criterion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_persona_comments" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "personaRunId" TEXT,
    "personaName" TEXT NOT NULL,
    "overallComment" TEXT NOT NULL,
    "whatWorked" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_persona_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_issues" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "raisedByPersonaRunId" TEXT,
    "severity" "IssueSeverity" NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'CREATED',
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT,
    "contentText" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "simulation_runs_sessionId_key" ON "simulation_runs"("sessionId");

-- CreateIndex
CREATE INDEX "simulation_runs_status_idx" ON "simulation_runs"("status");

-- CreateIndex
CREATE INDEX "simulation_runs_webhookConfigId_idx" ON "simulation_runs"("webhookConfigId");

-- CreateIndex
CREATE INDEX "simulation_run_personas_personaId_idx" ON "simulation_run_personas"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_run_personas_runId_orderIndex_key" ON "simulation_run_personas"("runId", "orderIndex");

-- CreateIndex
CREATE INDEX "messages_personaRunId_idx" ON "messages"("personaRunId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_runId_sequenceIndex_key" ON "messages"("runId", "sequenceIndex");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_runId_key" ON "evaluations"("runId");

-- CreateIndex
CREATE INDEX "evaluation_criterion_results_evaluationId_idx" ON "evaluation_criterion_results"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_criterion_results_personaRunId_idx" ON "evaluation_criterion_results"("personaRunId");

-- CreateIndex
CREATE INDEX "evaluation_criterion_results_relatedMessageId_idx" ON "evaluation_criterion_results"("relatedMessageId");

-- CreateIndex
CREATE INDEX "evaluation_persona_comments_evaluationId_idx" ON "evaluation_persona_comments"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_persona_comments_personaRunId_idx" ON "evaluation_persona_comments"("personaRunId");

-- CreateIndex
CREATE INDEX "evaluation_issues_evaluationId_idx" ON "evaluation_issues"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_issues_messageId_idx" ON "evaluation_issues"("messageId");

-- CreateIndex
CREATE INDEX "evaluation_issues_raisedByPersonaRunId_idx" ON "evaluation_issues"("raisedByPersonaRunId");

-- CreateIndex
CREATE INDEX "exports_runId_idx" ON "exports"("runId");

-- CreateIndex
CREATE INDEX "run_events_runId_idx" ON "run_events"("runId");

-- AddForeignKey
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_webhookConfigId_fkey" FOREIGN KEY ("webhookConfigId") REFERENCES "webhook_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_run_personas" ADD CONSTRAINT "simulation_run_personas_runId_fkey" FOREIGN KEY ("runId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_run_personas" ADD CONSTRAINT "simulation_run_personas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_runId_fkey" FOREIGN KEY ("runId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_personaRunId_fkey" FOREIGN KEY ("personaRunId") REFERENCES "simulation_run_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_runId_fkey" FOREIGN KEY ("runId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criterion_results" ADD CONSTRAINT "evaluation_criterion_results_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criterion_results" ADD CONSTRAINT "evaluation_criterion_results_personaRunId_fkey" FOREIGN KEY ("personaRunId") REFERENCES "simulation_run_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criterion_results" ADD CONSTRAINT "evaluation_criterion_results_relatedMessageId_fkey" FOREIGN KEY ("relatedMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_persona_comments" ADD CONSTRAINT "evaluation_persona_comments_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_persona_comments" ADD CONSTRAINT "evaluation_persona_comments_personaRunId_fkey" FOREIGN KEY ("personaRunId") REFERENCES "simulation_run_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_issues" ADD CONSTRAINT "evaluation_issues_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_issues" ADD CONSTRAINT "evaluation_issues_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_issues" ADD CONSTRAINT "evaluation_issues_raisedByPersonaRunId_fkey" FOREIGN KEY ("raisedByPersonaRunId") REFERENCES "simulation_run_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_runId_fkey" FOREIGN KEY ("runId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
