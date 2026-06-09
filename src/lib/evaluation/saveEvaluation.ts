import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { evaluateTranscript } from "@/lib/openai/evaluateTranscript";
import { logRunEvent } from "@/lib/simulation/runEvents";
import type {
  Criterion,
  CriterionStatus,
  IssueSeverity,
  IssueCategory,
} from "@prisma/client";

const CRITERION_MAP: Record<string, Criterion> = {
  accuracy: "ACCURACY",
  completeness: "COMPLETENESS",
  helpfulness: "HELPFULNESS",
  tone: "TONE",
  relevance: "RELEVANCE",
  hallucination: "HALLUCINATION",
};

const STATUS_MAP: Record<string, CriterionStatus> = {
  pass: "PASS",
  warning: "WARNING",
  fail: "FAIL",
};

const SEVERITY_MAP: Record<string, IssueSeverity> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

const CATEGORY_MAP: Record<string, IssueCategory> = {
  accuracy: "ACCURACY",
  completeness: "COMPLETENESS",
  helpfulness: "HELPFULNESS",
  tone: "TONE",
  relevance: "RELEVANCE",
  hallucination: "HALLUCINATION",
};

export async function evaluateAndSave(runId: string): Promise<void> {
  const run = await prisma.simulationRun.findUnique({
    where: { id: runId },
    include: {
      personas: { orderBy: { orderIndex: "asc" } },
      messages: { orderBy: { sequenceIndex: "asc" } },
    },
  });

  if (!run) throw new Error(`Run ${runId} not found`);

  // Build transcript for evaluation
  const transcript = run.messages.map((m) => {
    const personaRun = run.personas.find((p) => p.id === m.personaRunId);
    const snapshot = personaRun?.personaSnapshot as
      | { name: string }
      | undefined;
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      personaName: snapshot?.name,
      turnIndex: m.turnIndex,
    };
  });

  const personas = run.personas.map((p) => {
    const snap = p.personaSnapshot as { name: string; description: string };
    return { name: snap.name, description: snap.description };
  });

  await logRunEvent(runId, "EVALUATING", "Starting evaluation");

  const { result, model, rawJson } = await evaluateTranscript({
    chatbotName: run.chatbotName,
    chatbotPurpose: run.chatbotPurpose,
    testScenario: run.testScenario,
    ecommerceCategory: run.ecommerceCategory ?? undefined,
    personas,
    transcript,
  });

  // Validate: collect all chatbot message IDs
  const chatbotMessageIds = new Set(
    run.messages.filter((m) => m.role === "CHATBOT").map((m) => m.id),
  );

  // Check all issue message IDs exist
  for (const issue of result.issues) {
    if (!chatbotMessageIds.has(issue.messageId)) {
      throw new Error(
        `Evaluation rejected: issue references nonexistent message ID "${issue.messageId}". ` +
          `Valid chatbot message IDs: ${[...chatbotMessageIds].join(", ")}`,
      );
    }
  }

  // Build persona name → personaRun ID map
  const personaNameToRunId = new Map<string, string>();
  for (const p of run.personas) {
    const snap = p.personaSnapshot as { name: string };
    personaNameToRunId.set(snap.name, p.id);
  }

  // Delete prior evaluation (for re-evaluate)
  await prisma.evaluation.deleteMany({ where: { runId } });

  // Save evaluation
  const evaluation = await prisma.evaluation.create({
    data: {
      runId,
      model,
      summary: result.summary,
      rawJson: rawJson as Prisma.InputJsonValue,
      criteriaResults: {
        create: result.criteriaResults.map((cr) => {
          const relatedIds = cr.relatedMessageIds ?? [];
          // First valid chatbot message ID for the singular FK
          const firstValidId =
            relatedIds.find((id) => chatbotMessageIds.has(id)) ?? null;
          return {
            personaRunId: personaNameToRunId.get(cr.personaName) ?? null,
            criterion: CRITERION_MAP[cr.criterion] ?? "ACCURACY",
            status: STATUS_MAP[cr.status] ?? "PASS",
            explanation: cr.explanation,
            suggestedFix: cr.suggestedFix ?? null,
            relatedMessageIds: relatedIds,
            relatedMessageId: firstValidId,
          };
        }),
      },
      personaComments: {
        create: result.personaComments.map((pc) => ({
          personaRunId: personaNameToRunId.get(pc.personaName) ?? null,
          personaName: pc.personaName,
          overallComment: pc.overallComment,
          whatWorked: pc.whatWorked,
          concerns: pc.concerns,
        })),
      },
      issues: {
        create: result.issues.map((issue) => ({
          messageId: issue.messageId,
          raisedByPersonaRunId: null,
          severity: SEVERITY_MAP[issue.severity] ?? "LOW",
          category: CATEGORY_MAP[issue.category] ?? "ACCURACY",
          explanation: issue.explanation,
          suggestedFix: issue.suggestedFix,
        })),
      },
    },
  });

  await logRunEvent(runId, "EVALUATION_SAVED", "Evaluation saved", {
    evaluationId: evaluation.id,
    criteriaCount: result.criteriaResults.length,
    issueCount: result.issues.length,
  });
}
