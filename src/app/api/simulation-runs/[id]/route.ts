import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await prisma.simulationRun.findUnique({
      where: { id },
      include: {
        personas: {
          orderBy: { orderIndex: "asc" },
        },
        messages: {
          orderBy: { sequenceIndex: "asc" },
        },
        evaluation: {
          include: {
            criteriaResults: true,
            personaComments: true,
            issues: true,
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!run) throw notFoundError("Simulation run");
    return NextResponse.json(run);
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
    const existing = await prisma.simulationRun.findUnique({ where: { id } });
    if (!existing) throw notFoundError("Simulation run");

    await prisma.simulationRun.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
