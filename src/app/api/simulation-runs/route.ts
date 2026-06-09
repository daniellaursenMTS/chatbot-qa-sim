import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSimulationRunSchema } from "@/lib/validation";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSimulationRunSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError("Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const { webhookConfigId, personaIds, ...runData } = parsed.data;

    // Validate webhook config exists
    const webhookConfig = await prisma.webhookConfig.findUnique({
      where: { id: webhookConfigId },
    });
    if (!webhookConfig) throw notFoundError("Webhook config");

    // Validate all personas exist
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

    // Create run with snapshots
    const sessionId = generateSessionId();
    const webhookConfigSnapshot = {
      id: webhookConfig.id,
      name: webhookConfig.name,
      url: webhookConfig.url,
      method: webhookConfig.method,
      notes: webhookConfig.notes,
    };

    const run = await prisma.simulationRun.create({
      data: {
        sessionId,
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
      include: {
        personas: true,
      },
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
