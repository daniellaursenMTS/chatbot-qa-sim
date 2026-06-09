export interface InitialQuestionsPromptInput {
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory?: string;
  persona: {
    name: string;
    description: string;
    systemPrompt: string;
    skillFocus: string;
    ecommerceContext?: Record<string, string>;
  };
  count: number;
}

export function buildInitialQuestionsPrompt(
  input: InitialQuestionsPromptInput,
): string {
  const ecomCtx = input.persona.ecommerceContext
    ? `\nEcommerce context: Browsing style: ${input.persona.ecommerceContext.browsingStyle ?? "N/A"}, Patience level: ${input.persona.ecommerceContext.patienceLevel ?? "N/A"}, Product knowledge: ${input.persona.ecommerceContext.productKnowledge ?? "N/A"}, Tone: ${input.persona.ecommerceContext.tone ?? "N/A"}, Intent: ${input.persona.ecommerceContext.intent ?? "N/A"}`
    : "";

  return `You are simulating a real ecommerce customer interacting with a chatbot called "${input.chatbotName}".
The chatbot's purpose: ${input.chatbotPurpose}
Test scenario: ${input.testScenario}
${input.ecommerceCategory ? `Ecommerce category/product area: ${input.ecommerceCategory}` : ""}

You are playing the role of this customer persona:
Name: ${input.persona.name}
Description: ${input.persona.description}
Personality: ${input.persona.systemPrompt}
Skill/focus: ${input.persona.skillFocus}${ecomCtx}

Generate exactly ${input.count} initial questions that this customer would naturally ask the chatbot. Each question should be realistic, varied, and stay within the ecommerce scenario. The questions should sound like a real customer — never mention testing, simulation, QA, evaluation, personas, or webhooks. Do not be adversarial. Stay in character.`;
}

export interface FollowUpPromptInput {
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory?: string;
  persona: {
    name: string;
    description: string;
    systemPrompt: string;
    skillFocus: string;
    ecommerceContext?: Record<string, string>;
  };
  transcript: { role: string; content: string; personaName?: string }[];
  lastBotReply: string;
}

export function buildFollowUpPrompt(input: FollowUpPromptInput): string {
  const ecomCtx = input.persona.ecommerceContext
    ? `\nEcommerce context: Browsing style: ${input.persona.ecommerceContext.browsingStyle ?? "N/A"}, Patience level: ${input.persona.ecommerceContext.patienceLevel ?? "N/A"}, Product knowledge: ${input.persona.ecommerceContext.productKnowledge ?? "N/A"}, Tone: ${input.persona.ecommerceContext.tone ?? "N/A"}, Intent: ${input.persona.ecommerceContext.intent ?? "N/A"}`
    : "";

  const transcriptText = input.transcript
    .map(
      (m) =>
        `${m.role === "USER" ? `[${m.personaName ?? "Customer"}]` : `[${input.chatbotName}]`}: ${m.content}`,
    )
    .join("\n");

  return `You are simulating a real ecommerce customer interacting with a chatbot called "${input.chatbotName}".
The chatbot's purpose: ${input.chatbotPurpose}
Test scenario: ${input.testScenario}
${input.ecommerceCategory ? `Ecommerce category/product area: ${input.ecommerceCategory}` : ""}

You are playing the role of this customer persona:
Name: ${input.persona.name}
Description: ${input.persona.description}
Personality: ${input.persona.systemPrompt}
Skill/focus: ${input.persona.skillFocus}${ecomCtx}

Here is the conversation so far:
${transcriptText}

The chatbot just replied: "${input.lastBotReply}"

Generate exactly 1 follow-up message that this customer would naturally say next, based on the conversation history and the latest bot reply. The message should be realistic and stay within the ecommerce scenario. Sound like a real customer — never mention testing, simulation, QA, evaluation, personas, or webhooks. Do not be adversarial. Stay in character.`;
}

export interface EvaluateTranscriptPromptInput {
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory?: string;
  personas: {
    name: string;
    description: string;
  }[];
  transcript: {
    id: string;
    role: string;
    content: string;
    personaName?: string;
    turnIndex: number;
  }[];
}

export function buildEvaluateTranscriptPrompt(
  input: EvaluateTranscriptPromptInput,
): string {
  const transcriptText = input.transcript
    .map(
      (m) =>
        `[${m.role === "USER" ? m.personaName ?? "Customer" : input.chatbotName}] (id: ${m.id}, turn: ${m.turnIndex}): ${m.content}`,
    )
    .join("\n");

  const personaList = input.personas
    .map((p) => `- ${p.name}: ${p.description}`)
    .join("\n");

  return `You are an expert QA evaluator for ecommerce chatbots. Evaluate the following chatbot conversation transcript.

Chatbot: "${input.chatbotName}"
Purpose: ${input.chatbotPurpose}
Test scenario: ${input.testScenario}
${input.ecommerceCategory ? `Ecommerce category: ${input.ecommerceCategory}` : ""}

Personas involved:
${personaList}

Transcript:
${transcriptText}

Evaluate the chatbot's performance using these criteria for EACH persona: Accuracy, Completeness, Helpfulness, Tone of voice, Relevance, Hallucination risk.

For each criterion, assign a status: "pass", "warning", or "fail". Provide an explanation and optionally a suggested fix. Include related chatbot message IDs (from the transcript above — ONLY use IDs that appear in the transcript for CHATBOT messages, never invent IDs).

Also provide per-persona comments: an overall comment, what worked well, and concerns.

Finally, list specific issues found. Each issue MUST reference a CHATBOT message ID from the transcript. Never reference USER message IDs. Never invent message IDs. Include severity (low/medium/high), category, explanation, and suggested fix.

Provide a brief overall summary.

Return JSON only. Do NOT include a total score, averaged score, or consensus score.`;
}
