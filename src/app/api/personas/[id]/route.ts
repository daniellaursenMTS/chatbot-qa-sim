import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updatePersonaSchema } from "@/lib/validation";
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
    const persona = await prisma.persona.findUnique({ where: { id } });
    if (!persona) throw notFoundError("Persona");
    return NextResponse.json(persona);
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
    const existing = await prisma.persona.findUnique({ where: { id } });
    if (!existing) throw notFoundError("Persona");

    const body = await request.json();
    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError("Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const data: Prisma.PersonaUpdateInput = {
      ...parsed.data,
      ecommerceContext:
        parsed.data.ecommerceContext === null
          ? Prisma.JsonNull
          : parsed.data.ecommerceContext === undefined
            ? undefined
            : parsed.data.ecommerceContext,
    };
    const updated = await prisma.persona.update({
      where: { id },
      data,
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
    const existing = await prisma.persona.findUnique({ where: { id } });
    if (!existing) throw notFoundError("Persona");

    await prisma.persona.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
