import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPersonaSchema } from "@/lib/validation";
import { errorResponse, validationError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const personas = await prisma.persona.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(personas);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPersonaSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError("Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const persona = await prisma.persona.create({
      data: {
        ...parsed.data,
        ecommerceContext: parsed.data.ecommerceContext ?? undefined,
      },
    });
    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
