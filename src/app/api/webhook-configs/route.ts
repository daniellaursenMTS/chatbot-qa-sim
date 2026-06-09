import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createWebhookConfigSchema,
} from "@/lib/validation";
import { errorResponse, validationError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const configs = await prisma.webhookConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(configs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createWebhookConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError("Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const config = await prisma.webhookConfig.create({
      data: parsed.data,
    });
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
