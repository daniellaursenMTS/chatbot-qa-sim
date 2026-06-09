import { NextRequest, NextResponse } from "next/server";

// Test endpoint that returns various error responses based on query param "mode"
export async function POST(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");

  switch (mode) {
    case "non-json":
      return new Response("This is not JSON", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });

    case "json-no-reply":
      return NextResponse.json({ data: "no reply field here" });

    case "http500":
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );

    case "empty-reply":
      return NextResponse.json({ reply: "" });

    case "timeout":
      // Sleep 35 seconds (longer than default 30s timeout)
      await new Promise((resolve) => setTimeout(resolve, 35000));
      return NextResponse.json({ reply: "too late" });

    default:
      return NextResponse.json({ reply: "default response" });
  }
}
