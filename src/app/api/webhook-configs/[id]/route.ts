import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWebhookConfigSchema } from "@/lib/validation";
import {
  errorResponse,
  notFoundError,
  validationError,
} from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const config = await prisma.webhookConfig.findUnique({ where: { id } });
    if (!config) throw notFoundError("Webhook config");
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.webhookConfig.findUnique({ where: { id } });
    if (!existing) throw notFoundError("Webhook config");

    const body = await request.json();
    const parsed = updateWebhookConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError("Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const updated = await prisma.webhookConfig.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.webhookConfig.findUnique({ where: { id } });
    if (!existing) throw notFoundError("Webhook config");

    await prisma.webhookConfig.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
