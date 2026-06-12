import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  MAX_BOT_RESPONSES_PER_RUN: z.coerce.number().int().positive().default(100),
  CHIP_API_BASE_URL: z.string().url("CHIP_API_BASE_URL must be a valid URL").optional(),
});

function validateEnv() {
  // Skip strict validation during the Next.js production build phase —
  // required env vars (DATABASE_URL, OPENAI_API_KEY) are not available at
  // build time but will be validated at runtime startup.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      WEBHOOK_TIMEOUT_MS: Number(process.env.WEBHOOK_TIMEOUT_MS) || 30000,
      MAX_BOT_RESPONSES_PER_RUN:
        Number(process.env.MAX_BOT_RESPONSES_PER_RUN) || 100,
      CHIP_API_BASE_URL: process.env.CHIP_API_BASE_URL,
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
