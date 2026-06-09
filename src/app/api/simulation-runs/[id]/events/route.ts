import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await prisma.simulationRun.findUnique({ where: { id } });
    if (!run) throw notFoundError("Simulation run");

    const events = await prisma.runEvent.findMany({
      where: { runId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    return errorResponse(error);
  }
}
