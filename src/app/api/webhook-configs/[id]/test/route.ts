import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError } from "@/lib/utils/errors";
import { buildDefaultWebhookPayload } from "@/lib/webhook/defaultMapper";
import { sendWebhookMessage } from "@/lib/webhook/webhookClient";
import { generateSessionId } from "@/lib/utils/ids";
import { env } from "@/lib/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const config = await prisma.webhookConfig.findUnique({ where: { id } });
    if (!config) throw notFoundError("Webhook config");

    const sessionId = generateSessionId();
    const payload = buildDefaultWebhookPayload({
      sessionId,
      simulationRunId: "test",
      turnIndex: 0,
      personaName: "Test",
      message: "Hello, please reply with a short acknowledgement.",
    });

    try {
      const result = await sendWebhookMessage({
        config: { url: config.url, method: config.method },
        payload,
        timeoutMs: env.WEBHOOK_TIMEOUT_MS,
      });

      return NextResponse.json({
        ok: true,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        reply: result.reply,
        error: null,
      });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        statusCode: null,
        latencyMs: null,
        reply: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
