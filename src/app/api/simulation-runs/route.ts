import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSimulationRunSchema,
  createChipTestRunSchema,
} from "@/lib/validation";
import { Prisma } from "@prisma/client";
import {
  errorResponse,
  validationError,
  notFoundError,
} from "@/lib/utils/errors";
import { generateSessionId } from "@/lib/utils/ids";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const runs = await prisma.simulationRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        personas: { include: { persona: true } },
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(runs);
  } catch (error) {
    return errorResponse(error);
  }
}

async function createWebhookRun(body: unknown) {
  const parsed = createSimulationRunSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const { webhookConfigId, personaIds, ...runData } = parsed.data;

  const webhookConfig = await prisma.webhookConfig.findUnique({
    where: { id: webhookConfigId },
  });
  if (!webhookConfig) throw notFoundError("Webhook config");

  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
  });
  if (personas.length !== personaIds.length) {
    const found = new Set(personas.map((p) => p.id));
    const missing = personaIds.filter((id) => !found.has(id));
    throw validationError("Some personas not found", { missingIds: missing });
  }

  const targetBotResponseCount =
    runData.initialQuestionCount + runData.followUpQuestionCount;

  if (targetBotResponseCount > env.MAX_BOT_RESPONSES_PER_RUN) {
    throw validationError(
      `Total bot responses (${targetBotResponseCount}) exceeds maximum (${env.MAX_BOT_RESPONSES_PER_RUN})`,
    );
  }

  const sessionId = generateSessionId();
  const webhookConfigSnapshot = {
    id: webhookConfig.id,
    name: webhookConfig.name,
    url: webhookConfig.url,
    method: webhookConfig.method,
    notes: webhookConfig.notes,
  };

  return prisma.simulationRun.create({
    data: {
      sessionId,
      mode: "WEBHOOK",
      webhookConfigId,
      webhookConfigSnapshot,
      ...runData,
      targetBotResponseCount,
      openaiModel: env.OPENAI_MODEL,
      personas: {
        create: personaIds.map((personaId, index) => {
          const persona = personas.find((p) => p.id === personaId)!;
          return {
            personaId,
            orderIndex: index,
            personaSnapshot: {
              id: persona.id,
              name: persona.name,
              description: persona.description,
              systemPrompt: persona.systemPrompt,
              skillFocus: persona.skillFocus,
              ecommerceContext: persona.ecommerceContext,
              active: persona.active,
            },
          };
        }),
      },
    },
    include: { personas: true },
  });
}

async function createChipTestRun(body: unknown) {
  const parsed = createChipTestRunSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const { chipTestConfig, ...runData } = parsed.data;

  // Max responses: productIds × 4 chips each
  const targetBotResponseCount = chipTestConfig.productIds.length * 4;
  if (targetBotResponseCount > env.MAX_BOT_RESPONSES_PER_RUN) {
    throw validationError(
      `Estimated bot responses (${targetBotResponseCount}) exceeds maximum (${env.MAX_BOT_RESPONSES_PER_RUN})`,
    );
  }

  const sessionId = generateSessionId();

  return prisma.simulationRun.create({
    data: {
      sessionId,
      mode: "CHIP_TEST",
      webhookConfigSnapshot: {},
      chipTestConfig: chipTestConfig as unknown as Prisma.InputJsonValue,
      chatbotName: runData.chatbotName,
      chatbotPurpose: runData.chatbotPurpose,
      testScenario: runData.testScenario,
      ecommerceCategory: runData.ecommerceCategory,
      initialQuestionCount: 0,
      followUpQuestionCount: 0,
      targetBotResponseCount,
      openaiModel: env.OPENAI_MODEL,
      personas: {
        create: [
          {
            orderIndex: 0,
            personaSnapshot: {
              name: "Chip Tester",
              description: "Automated chip coverage test",
              systemPrompt: "",
              skillFocus: "chip-api-testing",
            },
          },
        ],
      },
    },
    include: { personas: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const isChipTest =
      typeof body === "object" && body !== null && body.mode === "CHIP_TEST";

    const run = isChipTest
      ? await createChipTestRun(body)
      : await createWebhookRun(body);

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
