export interface WebhookConfig {
  url: string;
  method: string;
}

export interface WebhookResult {
  reply: string;
  rawJson: unknown;
  statusCode: number;
  latencyMs: number;
}

export async function sendWebhookMessage({
  config,
  payload,
  timeoutMs,
}: {
  config: WebhookConfig;
  payload: unknown;
  timeoutMs: number;
}): Promise<WebhookResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: config.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Webhook request timed out after ${timeoutMs}ms`);
    }
    throw new Error(
      `Webhook request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  clearTimeout(timeout);

  const latencyMs = Date.now() - start;
  const statusCode = response.status;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Webhook returned HTTP ${statusCode}: ${body.slice(0, 500)}`,
    );
  }

  const text = await response.text();
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch {
    throw new Error(
      `Webhook response is not valid JSON: ${text.slice(0, 500)}`,
    );
  }

  // Parse the reply using the default mapper
  const { parseDefaultWebhookResponse } = await import("./defaultMapper");
  const reply = parseDefaultWebhookResponse(rawJson);

  return { reply, rawJson, statusCode, latencyMs };
}
