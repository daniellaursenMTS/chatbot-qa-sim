import { getOpenAIClient, getModel } from "./client";
import {
  buildFollowUpPrompt,
  type FollowUpPromptInput,
} from "./prompts";
import { followUpQuestionSchema } from "./schemas";

export async function generateFollowUpQuestion(
  input: FollowUpPromptInput,
): Promise<string> {
  const client = getOpenAIClient();
  const prompt = buildFollowUpPrompt(input);

  const response = await client.responses.create({
    model: getModel(),
    input: [{ role: "user", content: prompt }],
    text: {
      format: {
        type: "json_schema",
        name: "follow_up_question",
        schema: followUpQuestionSchema,
        strict: true,
      },
    },
  });

  const text = response.output_text;
  const parsed = JSON.parse(text) as { question: string };
  return parsed.question;
}
