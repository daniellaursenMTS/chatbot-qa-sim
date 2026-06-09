import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logRunEvent(
  runId: string,
  type: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await prisma.runEvent.create({
    data: {
      runId,
      type,
      message,
      data: data as Prisma.InputJsonValue | undefined,
    },
  });
}
