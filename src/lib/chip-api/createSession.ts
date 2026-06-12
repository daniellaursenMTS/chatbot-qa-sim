export async function createChatSession(baseUrl: string, timeoutMs = 30000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat/initiate`, {
      method: "POST",
      headers: { "Content-Length": "0" },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Failed to create chat session (HTTP ${response.status}): ${body.slice(0, 500)}`,
      );
    }

    const data = await response.json();
    return data.session_id;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Chat session creation timed out after ${timeoutMs}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
