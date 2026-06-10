import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError, ApiError } from "@/lib/utils/errors";
import { executeSimulationRun } from "@/lib/simulation/engine";
import { executeChipTestRun } from "@/lib/simulation/chipTestEngine";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await prisma.simulationRun.findUnique({ where: { id } });
    if (!run) throw notFoundError("Simulation run");
    if (run.status === "RUNNING") {
      throw new ApiError(
        409,
        "ALREADY_RUNNING",
        "This simulation run is already executing",
      );
    }

    if (run.mode === "CHIP_TEST") {
      await executeChipTestRun(id);
    } else {
      await executeSimulationRun(id);
    }

    const updated = await prisma.simulationRun.findUnique({
      where: { id },
      include: {
        personas: { orderBy: { orderIndex: "asc" } },
        messages: { orderBy: { sequenceIndex: "asc" } },
        evaluation: {
          include: {
            criteriaResults: true,
            personaComments: true,
            issues: true,
          },
        },
        events: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
