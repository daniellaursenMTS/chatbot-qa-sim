export async function createChatSession(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/chat/initiate`, {
    method: "POST",
    headers: { "Content-Length": "0" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to create chat session (HTTP ${response.status}): ${body.slice(0, 500)}`,
    );
  }

  const data = await response.json();
  return data.session_id;
}
