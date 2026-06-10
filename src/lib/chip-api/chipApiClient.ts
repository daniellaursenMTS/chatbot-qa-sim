export interface ChipApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface Chip {
  text: string;
  query: string;
  product_id: number | null;
  primary_category: string | null;
}

export interface ChipAnswerResult {
  answer: string;
  events: SimpleEvent[];
  latencyMs: number;
  sessionId: string;
}

interface SimpleEvent {
  author?: string;
  content?: {
    parts: { text: string }[];
    role: string;
  };
  partial?: boolean;
  turn_complete?: boolean;
  finish_reason?: string;
  error_code?: string;
  error_message?: string;
  timestamp?: number;
}

export async function fetchChips(
  config: ChipApiConfig,
  productId: number,
  options?: { generateOnDemand?: boolean; withReasoning?: boolean },
): Promise<Chip[]> {
  const generateOnDemand = options?.generateOnDemand ?? false;
  const withReasoning = options?.withReasoning ?? false;

  let url: string;
  let fetchOptions: RequestInit;

  if (generateOnDemand) {
    url = `${config.baseUrl}/chips/cag?product_id=${productId}&with_reasoning=${withReasoning}`;
    fetchOptions = { method: "POST" };
  } else {
    url = `${config.baseUrl}/chips/get?product_id=${productId}`;
    fetchOptions = { method: "GET" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch chips for product ${productId} (HTTP ${response.status}): ${body.slice(0, 500)}`,
      );
    }

    const data = await response.json();
    return (data.chips ?? []) as Chip[];
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Chip fetch timed out after ${config.timeoutMs}ms for product ${productId}`,
      );
    }
    throw error;
  }
}

export async function sendChipQuery(
  config: ChipApiConfig,
  sessionId: string,
  chip: Chip,
): Promise<ChipAnswerResult> {
  const url = `${config.baseUrl}/api/chat/${sessionId}/run`;
  const body: Record<string, unknown> = {
    new_message: chip.query,
  };
  if (chip.product_id != null) {
    body.product_id = chip.product_id;
  }
  if (chip.primary_category != null) {
    body.primary_category = chip.primary_category;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const start = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Chip query timed out after ${config.timeoutMs}ms`,
      );
    }
    throw error;
  }

  if (!response.ok) {
    clearTimeout(timeout);
    const text = await response.text().catch(() => "");
    throw new Error(
      `Chip query failed (HTTP ${response.status}): ${text.slice(0, 500)}`,
    );
  }

  const events: SimpleEvent[] = [];
  let answer = "";

  const reader = response.body?.getReader();
  if (!reader) {
    clearTimeout(timeout);
    throw new Error("No response body for SSE stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        let event: SimpleEvent;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        events.push(event);

        if (event.error_code || event.error_message) {
          throw new Error(
            `Stream error: ${event.error_code ?? ""} ${event.error_message ?? ""}`.trim(),
          );
        }

        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              answer += part.text;
            }
          }
        }

        if (event.turn_complete) break;
      }
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }

  const latencyMs = Date.now() - start;

  return { answer, events, latencyMs, sessionId };
}
