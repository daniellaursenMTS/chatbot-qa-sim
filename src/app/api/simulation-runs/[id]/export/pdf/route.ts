import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError } from "@/lib/utils/errors";
import { buildPdfReport } from "@/lib/export/pdfReport";

async function loadRunForExport(id: string) {
  const run = await prisma.simulationRun.findUnique({
    where: { id },
    include: {
      personas: {
        orderBy: { orderIndex: "asc" },
      },
      messages: {
        orderBy: { sequenceIndex: "asc" },
        include: {
          personaRun: true,
        },
      },
      evaluation: {
        include: {
          criteriaResults: { include: { personaRun: true } },
          personaComments: true,
          issues: true,
        },
      },
    },
  });
  return run;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await loadRunForExport(id);
    if (!run) throw notFoundError("Simulation run");

    const fileName = `simulation-${id}.pdf`;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await buildPdfReport(run as never);
    } catch (error) {
      // PDF failure → 500 + Export FAILED, must NOT change run status
      await prisma.export.create({
        data: {
          runId: id,
          type: "PDF",
          status: "FAILED",
          fileName,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return NextResponse.json(
        {
          error: {
            code: "PDF_GENERATION_FAILED",
            message: "Failed to generate PDF",
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          },
        },
        { status: 500 },
      );
    }

    // Save export record
    await prisma.export.create({
      data: {
        runId: id,
        type: "PDF",
        status: "CREATED",
        fileName,
      },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
