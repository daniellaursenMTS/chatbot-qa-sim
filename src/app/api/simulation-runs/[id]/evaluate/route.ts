import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError, ApiError } from "@/lib/utils/errors";
import { evaluateAndSave } from "@/lib/evaluation/saveEvaluation";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await prisma.simulationRun.findUnique({
      where: { id },
      include: { messages: { select: { id: true } } },
    });
    if (!run) throw notFoundError("Simulation run");
    if (run.messages.length === 0) {
      throw new ApiError(
        400,
        "NO_MESSAGES",
        "Cannot evaluate a run with no messages",
      );
    }

    await evaluateAndSave(id);

    // Mark completed if it was evaluating or failed
    if (run.status === "EVALUATING" || run.status === "FAILED") {
      await prisma.simulationRun.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    const updated = await prisma.simulationRun.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            criteriaResults: true,
            personaComments: true,
            issues: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
