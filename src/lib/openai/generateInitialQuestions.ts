import { getOpenAIClient, getModel } from "./client";
import {
  buildInitialQuestionsPrompt,
  type InitialQuestionsPromptInput,
} from "./prompts";
import { initialQuestionsSchema } from "./schemas";

export async function generateInitialQuestions(
  input: InitialQuestionsPromptInput,
): Promise<string[]> {
  const client = getOpenAIClient();
  const prompt = buildInitialQuestionsPrompt(input);

  const response = await client.responses.create({
    model: getModel(),
    input: [{ role: "user", content: prompt }],
    text: {
      format: {
        type: "json_schema",
        name: "initial_questions",
        schema: initialQuestionsSchema,
        strict: true,
      },
    },
  });

  const text = response.output_text;
  const parsed = JSON.parse(text) as { questions: string[] };
  return parsed.questions;
}
