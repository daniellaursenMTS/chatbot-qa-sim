import { getOpenAIClient, getModel } from "./client";
import {
  buildEvaluateTranscriptPrompt,
  type EvaluateTranscriptPromptInput,
} from "./prompts";
import { evaluationSchema } from "./schemas";

export interface EvaluationResult {
  summary: string;
  criteriaResults: {
    personaName: string;
    criterion: string;
    status: string;
    explanation: string;
    suggestedFix?: string;
    relatedMessageIds: string[];
  }[];
  personaComments: {
    personaName: string;
    overallComment: string;
    whatWorked: string[];
    concerns: string[];
  }[];
  issues: {
    messageId: string;
    severity: string;
    category: string;
    explanation: string;
    suggestedFix: string;
  }[];
}

export async function evaluateTranscript(
  input: EvaluateTranscriptPromptInput,
): Promise<{ result: EvaluationResult; model: string; rawJson: unknown }> {
  const client = getOpenAIClient();
  const model = getModel();
  const prompt = buildEvaluateTranscriptPrompt(input);

  const response = await client.responses.create({
    model,
    input: [{ role: "user", content: prompt }],
    text: {
      format: {
        type: "json_schema",
        name: "evaluation",
        schema: evaluationSchema,
        strict: true,
      },
    },
  });

  const text = response.output_text;
  const rawJson = JSON.parse(text);
  return { result: rawJson as EvaluationResult, model, rawJson };
}
