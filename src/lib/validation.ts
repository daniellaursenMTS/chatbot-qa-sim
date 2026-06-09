import { z } from "zod";
import { env } from "@/lib/env";

export const createWebhookConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["POST", "PUT"]).default("POST"),
  notes: z.string().optional(),
});

export const updateWebhookConfigSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  method: z.enum(["POST", "PUT"]).optional(),
  notes: z.string().nullable().optional(),
});

export const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  skillFocus: z.string().min(1, "Skill focus is required"),
  ecommerceContext: z
    .object({
      browsingStyle: z.string().optional(),
      patienceLevel: z.string().optional(),
      productKnowledge: z.string().optional(),
      tone: z.string().optional(),
      intent: z.string().optional(),
    })
    .optional(),
  active: z.boolean().default(true),
});

export const updatePersonaSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  skillFocus: z.string().min(1).optional(),
  ecommerceContext: z
    .object({
      browsingStyle: z.string().optional(),
      patienceLevel: z.string().optional(),
      productKnowledge: z.string().optional(),
      tone: z.string().optional(),
      intent: z.string().optional(),
    })
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export const createSimulationRunSchema = z
  .object({
    webhookConfigId: z.string().uuid("Invalid webhook config ID"),
    personaIds: z
      .array(z.string().uuid())
      .min(1, "At least 1 persona required")
      .max(20, "Maximum 20 personas allowed"),
    chatbotName: z.string().min(1, "Chatbot name is required"),
    chatbotPurpose: z.string().min(1, "Chatbot purpose is required"),
    testScenario: z.string().min(1, "Test scenario is required"),
    ecommerceCategory: z.string().optional(),
    initialQuestionCount: z
      .number()
      .int()
      .min(1, "At least 1 initial question required"),
    followUpQuestionCount: z
      .number()
      .int()
      .min(0, "Follow-up count must be >= 0"),
  })
  .refine(
    (data) =>
      data.initialQuestionCount + data.followUpQuestionCount <=
      env.MAX_BOT_RESPONSES_PER_RUN,
    {
      message: `Total questions must not exceed ${env.MAX_BOT_RESPONSES_PER_RUN}`,
      path: ["followUpQuestionCount"],
    },
  );
