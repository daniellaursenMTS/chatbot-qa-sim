import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, notFoundError } from "@/lib/utils/errors";
import { buildMarkdownReport } from "@/lib/export/markdownReport";

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

    const markdown = buildMarkdownReport(run as never);
    const fileName = `simulation-${id}.md`;

    // Save export record
    await prisma.export.create({
      data: {
        runId: id,
        type: "MARKDOWN",
        status: "CREATED",
        fileName,
        contentText: markdown,
      },
    });

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
