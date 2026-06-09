export interface WebhookPayload {
  sessionId: string;
  message: string;
  metadata: {
    simulationRunId: string;
    turnIndex: number;
    personaName: string;
  };
}

export interface WebhookPayloadInput {
  sessionId: string;
  simulationRunId: string;
  turnIndex: number;
  personaName: string;
  message: string;
}

export function buildDefaultWebhookPayload(
  input: WebhookPayloadInput,
): WebhookPayload {
  return {
    sessionId: input.sessionId,
    message: input.message,
    metadata: {
      simulationRunId: input.simulationRunId,
      turnIndex: input.turnIndex,
      personaName: input.personaName,
    },
  };
}

export function parseDefaultWebhookResponse(json: unknown): string {
  if (
    typeof json !== "object" ||
    json === null ||
    !("reply" in json) ||
    typeof (json as Record<string, unknown>).reply !== "string"
  ) {
    throw new Error(
      "Invalid webhook response: expected { reply: string }, got " +
        JSON.stringify(json),
    );
  }
  const reply = (json as Record<string, unknown>).reply as string;
  if (reply.trim().length === 0) {
    throw new Error("Invalid webhook response: reply is empty");
  }
  return reply;
}
