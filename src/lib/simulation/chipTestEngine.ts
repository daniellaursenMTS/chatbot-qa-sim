import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { logRunEvent } from "./runEvents";
import { createChatSession } from "@/lib/chip-api/createSession";
import {
  fetchChips,
  sendChipQuery,
  type ChipApiConfig,
  type Chip,
} from "@/lib/chip-api/chipApiClient";

interface ChipTestConfig {
  productIds: number[];
  generateOnDemand: boolean;
  withReasoning?: boolean;
  timeoutMs?: number;
}

export async function executeChipTestRun(runId: string): Promise<void> {
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

  const chipTestConfig = run.chipTestConfig as unknown as ChipTestConfig;
  if (!chipTestConfig) {
    throw new Error(`Run ${runId} has no chipTestConfig`);
  }

  await prisma.simulationRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  await logRunEvent(runId, "STATUS_CHANGE", "Chip test run started", {
    status: "RUNNING",
  });

  if (!env.CHIP_API_BASE_URL) {
    throw new Error("CHIP_API_BASE_URL environment variable is not configured");
  }

  const apiConfig: ChipApiConfig = {
    baseUrl: env.CHIP_API_BASE_URL,
    timeoutMs: chipTestConfig.timeoutMs ?? env.WEBHOOK_TIMEOUT_MS,
  };

  // The run should have one synthetic persona created at run-creation time
  const personaRun = run.personas[0];
  if (!personaRun) {
    throw new Error(`Run ${runId} has no persona run`);
  }

  let sequenceIndex = 0;
  let turnIndex = 0;

  try {
    for (const productId of chipTestConfig.productIds) {
      // Create a fresh session for each product
      await logRunEvent(runId, "CREATING_SESSION", `Creating chat session for product ${productId}`);
      const sessionId = await createChatSession(apiConfig.baseUrl, apiConfig.timeoutMs);
      await logRunEvent(runId, "SESSION_CREATED", `Session: ${sessionId} (product ${productId})`);
      // Fetch chips for this product
      await logRunEvent(
        runId,
        "FETCHING_CHIPS",
        `Fetching chips for product ${productId}`,
      );

      let chips: Chip[] = await fetchChips(apiConfig, productId, {
        generateOnDemand: false,
      });

      // Fallback to on-demand generation if no pre-generated chips
      if (chips.length === 0 && chipTestConfig.generateOnDemand) {
        await logRunEvent(
          runId,
          "GENERATING_CHIPS",
          `No pre-generated chips for product ${productId}, generating on-demand`,
        );
        chips = await fetchChips(apiConfig, productId, {
          generateOnDemand: true,
          withReasoning: chipTestConfig.withReasoning ?? false,
        });
      }

      if (chips.length === 0) {
        await logRunEvent(
          runId,
          "NO_CHIPS",
          `No chips available for product ${productId}, skipping`,
        );
        continue;
      }

      await logRunEvent(
        runId,
        "CHIPS_FETCHED",
        `Got ${chips.length} chips for product ${productId}`,
        { productId, chipCount: chips.length },
      );

      // Send each chip query
      for (const chip of chips) {
        // Save USER message (the chip question)
        await prisma.message.create({
          data: {
            runId,
            personaRunId: personaRun.id,
            role: "USER",
            sequenceIndex,
            turnIndex,
            content: chip.query,
            generationSource: "INITIAL",
          },
        });

        await logRunEvent(
          runId,
          "USER_MESSAGE",
          `[Product ${productId}] ${chip.text}: ${chip.query.slice(0, 80)}`,
          { productId, chipText: chip.text, turnIndex },
        );

        const requestPayload = {
          new_message: chip.query,
          product_id: chip.product_id,
          primary_category: chip.primary_category,
          session_id: sessionId,
        };

        try {
          const result = await sendChipQuery(apiConfig, sessionId, chip);

          // Save CHATBOT message
          await prisma.message.create({
            data: {
              runId,
              personaRunId: personaRun.id,
              role: "CHATBOT",
              sequenceIndex: sequenceIndex + 1,
              turnIndex,
              content: result.answer,
              generationSource: "WEBHOOK_REPLY",
              webhookRequestPayload:
                requestPayload as unknown as Prisma.InputJsonValue,
              webhookResponsePayload:
                result.events as unknown as Prisma.InputJsonValue,
              webhookStatusCode: 200,
              webhookLatencyMs: result.latencyMs,
            },
          });

          await logRunEvent(
            runId,
            "CHATBOT_REPLY",
            `[Product ${productId}] ${result.answer.slice(0, 100)}`,
            { productId, turnIndex, latencyMs: result.latencyMs },
          );
        } catch (error) {
          // Save failed attempt
          await prisma.message.create({
            data: {
              runId,
              personaRunId: personaRun.id,
              role: "CHATBOT",
              sequenceIndex: sequenceIndex + 1,
              turnIndex,
              content: "",
              generationSource: "WEBHOOK_REPLY",
              webhookRequestPayload:
                requestPayload as unknown as Prisma.InputJsonValue,
              webhookError:
                error instanceof Error ? error.message : String(error),
            },
          });
          throw error;
        }

        sequenceIndex += 2;
        turnIndex++;
      }
    }

    // Evaluate
    await prisma.simulationRun.update({
      where: { id: runId },
      data: { status: "EVALUATING" },
    });
    await logRunEvent(runId, "STATUS_CHANGE", "Run evaluating", {
      status: "EVALUATING",
    });

    const { evaluateAndSave } = await import("@/lib/evaluation/saveEvaluation");
    await evaluateAndSave(runId);

    // Complete
    await prisma.simulationRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await logRunEvent(runId, "STATUS_CHANGE", "Run completed", {
      status: "COMPLETED",
    });
  } catch (error) {
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
