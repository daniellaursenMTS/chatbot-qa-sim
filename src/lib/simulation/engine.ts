import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { logRunEvent } from "./runEvents";
import { generateInitialQuestions } from "@/lib/openai/generateInitialQuestions";
import { generateFollowUpQuestion } from "@/lib/openai/generateFollowUpQuestion";
import { buildDefaultWebhookPayload } from "@/lib/webhook/defaultMapper";
import { sendWebhookMessage } from "@/lib/webhook/webhookClient";
import type { SimulationRun, SimulationRunPersona } from "@prisma/client";

interface PersonaSnapshot {
  name: string;
  description: string;
  systemPrompt: string;
  skillFocus: string;
  ecommerceContext?: Record<string, string>;
}

interface WebhookSnapshot {
  url: string;
  method: string;
}

export async function executeSimulationRun(runId: string): Promise<void> {
  // Load the run
  const run = await prisma.simulationRun.findUnique({
    where: { id: runId },
    include: {
      personas: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status === "RUNNING") {
    throw new Error(`Run ${runId} is already running`);
  }

  // Mark as RUNNING
  await prisma.simulationRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  await logRunEvent(runId, "STATUS_CHANGE", "Run started", {
    status: "RUNNING",
  });

  const webhookConfig = run.webhookConfigSnapshot as unknown as WebhookSnapshot;
  let sequenceIndex = 0;
  let turnIndex = 0;

  try {
    // Phase 1: Generate all initial questions for all personas
    const initialQuestionsByPersona: Map<string, string[]> = new Map();

    for (const personaRun of run.personas) {
      const persona = personaRun.personaSnapshot as unknown as PersonaSnapshot;
      await logRunEvent(
        runId,
        "GENERATING_INITIAL_QUESTIONS",
        `Generating ${run.initialQuestionCount} initial questions for ${persona.name}`,
      );

      const questions = await generateInitialQuestions({
        chatbotName: run.chatbotName,
        chatbotPurpose: run.chatbotPurpose,
        testScenario: run.testScenario,
        ecommerceCategory: run.ecommerceCategory ?? undefined,
        persona,
        count: run.initialQuestionCount,
      });

      initialQuestionsByPersona.set(personaRun.id, questions);
      await logRunEvent(
        runId,
        "INITIAL_QUESTIONS_GENERATED",
        `Generated ${questions.length} questions for ${persona.name}`,
      );
    }

    // Phase 2: Send initial questions — round-robin through personas
    const initialQueue: { personaRun: SimulationRunPersona; question: string }[] =
      [];
    for (let q = 0; q < run.initialQuestionCount; q++) {
      for (const personaRun of run.personas) {
        const questions = initialQuestionsByPersona.get(personaRun.id)!;
        if (q < questions.length) {
          initialQueue.push({ personaRun, question: questions[q] });
        }
      }
    }

    for (const { personaRun, question } of initialQueue) {
      const persona = personaRun.personaSnapshot as unknown as PersonaSnapshot;
      await sendTurnAndSave(
        run,
        personaRun,
        persona,
        webhookConfig,
        question,
        "INITIAL",
        sequenceIndex,
        turnIndex,
      );
      sequenceIndex += 2; // user msg + chatbot msg
      turnIndex++;
    }

    // Phase 3: Generate follow-ups one at a time, round-robin
    let followUpsSent = 0;
    let personaIndex = 0;
    while (followUpsSent < run.followUpQuestionCount) {
      const personaRun =
        run.personas[personaIndex % run.personas.length];
      const persona = personaRun.personaSnapshot as unknown as PersonaSnapshot;

      // Load current transcript for context
      const messages = await prisma.message.findMany({
        where: { runId },
        orderBy: { sequenceIndex: "asc" },
        select: { role: true, content: true, personaRun: { select: { personaSnapshot: true } } },
      });

      const transcript = messages.map((m) => ({
        role: m.role,
        content: m.content,
        personaName: m.personaRun
          ? (m.personaRun.personaSnapshot as unknown as PersonaSnapshot).name
          : undefined,
      }));

      const lastBotReply =
        messages.length > 0 ? messages[messages.length - 1].content : "";

      await logRunEvent(
        runId,
        "GENERATING_FOLLOW_UP",
        `Generating follow-up for ${persona.name}`,
      );

      const followUp = await generateFollowUpQuestion({
        chatbotName: run.chatbotName,
        chatbotPurpose: run.chatbotPurpose,
        testScenario: run.testScenario,
        ecommerceCategory: run.ecommerceCategory ?? undefined,
        persona,
        transcript,
        lastBotReply,
      });

      await sendTurnAndSave(
        run,
        personaRun,
        persona,
        webhookConfig,
        followUp,
        "FOLLOW_UP",
        sequenceIndex,
        turnIndex,
      );
      sequenceIndex += 2;
      turnIndex++;
      followUpsSent++;
      personaIndex++;
    }

    // Mark as EVALUATING
    await prisma.simulationRun.update({
      where: { id: runId },
      data: { status: "EVALUATING" },
    });
    await logRunEvent(runId, "STATUS_CHANGE", "Run evaluating", {
      status: "EVALUATING",
    });

    // Auto-evaluate
    const { evaluateAndSave } = await import("@/lib/evaluation/saveEvaluation");
    await evaluateAndSave(runId);

    // Mark as COMPLETED
    await prisma.simulationRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await logRunEvent(runId, "STATUS_CHANGE", "Run completed", {
      status: "COMPLETED",
    });
  } catch (error) {
    // Preserve partial transcript, mark FAILED
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.simulationRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage,
        errorDetails: { stack: error instanceof Error ? error.stack : null },
      },
    });
    await logRunEvent(runId, "STATUS_CHANGE", "Run failed", {
      status: "FAILED",
      error: errorMessage,
    });
    throw error;
  }
}

async function sendTurnAndSave(
  run: SimulationRun,
  personaRun: SimulationRunPersona,
  persona: PersonaSnapshot,
  webhookConfig: WebhookSnapshot,
  question: string,
  source: "INITIAL" | "FOLLOW_UP",
  sequenceIndex: number,
  turnIndex: number,
): Promise<void> {
  // Save USER message
  await prisma.message.create({
    data: {
      runId: run.id,
      personaRunId: personaRun.id,
      role: "USER",
      sequenceIndex,
      turnIndex,
      content: question,
      generationSource: source,
    },
  });

  await logRunEvent(
    run.id,
    "USER_MESSAGE",
    `[${persona.name}] ${question.slice(0, 100)}`,
    { personaName: persona.name, turnIndex, source },
  );

  // Send to webhook
  const payload = buildDefaultWebhookPayload({
    sessionId: run.sessionId,
    simulationRunId: run.id,
    turnIndex,
    personaName: persona.name,
    message: question,
  });

  try {
    const result = await sendWebhookMessage({
      config: webhookConfig,
      payload,
      timeoutMs: env.WEBHOOK_TIMEOUT_MS,
    });

    // Save CHATBOT message
    await prisma.message.create({
      data: {
        runId: run.id,
        personaRunId: personaRun.id,
        role: "CHATBOT",
        sequenceIndex: sequenceIndex + 1,
        turnIndex,
        content: result.reply,
        generationSource: "WEBHOOK_REPLY",
        webhookRequestPayload: payload as unknown as Prisma.InputJsonValue,
        webhookResponsePayload: result.rawJson as Prisma.InputJsonValue,
        webhookStatusCode: result.statusCode,
        webhookLatencyMs: result.latencyMs,
      },
    });

    await logRunEvent(
      run.id,
      "CHATBOT_REPLY",
      `[${run.chatbotName}] ${result.reply.slice(0, 100)}`,
      { turnIndex, latencyMs: result.latencyMs },
    );
  } catch (error) {
    // Save failed webhook attempt
    await prisma.message.create({
      data: {
        runId: run.id,
        personaRunId: personaRun.id,
        role: "CHATBOT",
        sequenceIndex: sequenceIndex + 1,
        turnIndex,
        content: "",
        generationSource: "WEBHOOK_REPLY",
        webhookRequestPayload: payload as unknown as Prisma.InputJsonValue,
        webhookError:
          error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
