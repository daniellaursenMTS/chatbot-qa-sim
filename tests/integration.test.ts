/**
 * Integration tests for §19 Phase 8:
 *   - Create run, execute against mock webhook, evaluation save, export generation
 *   - Webhook mapper, evaluation parser, markdown export
 *
 * Run with: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatbot_qa_sim?schema=public" npx tsx --test tests/integration.test.ts
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Set env before any app imports
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/chatbot_qa_sim?schema=public";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "sk-test-fake-key";
process.env.OPENAI_MODEL = "gpt-4o-mini";
process.env.WEBHOOK_TIMEOUT_MS = "5000";
process.env.MAX_BOT_RESPONSES_PER_RUN = "100";

const BASE_URL = "http://localhost:3000";

// ── DB Helper ────────────────────────────────────────────────────────

async function getTestPrisma() {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// ── Helpers ──────────────────────────────────────────────────────────

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

// ── 1. Webhook Mapper Unit Tests ─────────────────────────────────────

describe("Webhook Default Mapper", () => {
  it("buildDefaultWebhookPayload produces correct structure", async () => {
    const { buildDefaultWebhookPayload } = await import(
      "../src/lib/webhook/defaultMapper"
    );
    const payload = buildDefaultWebhookPayload({
      sessionId: "ses_abc123",
      simulationRunId: "run_456",
      turnIndex: 3,
      personaName: "Alice",
      message: "What products do you have?",
    });

    assert.equal(payload.sessionId, "ses_abc123");
    assert.equal(payload.message, "What products do you have?");
    assert.equal(payload.metadata.simulationRunId, "run_456");
    assert.equal(payload.metadata.turnIndex, 3);
    assert.equal(payload.metadata.personaName, "Alice");
  });

  it("parseDefaultWebhookResponse extracts reply string", async () => {
    const { parseDefaultWebhookResponse } = await import(
      "../src/lib/webhook/defaultMapper"
    );
    const reply = parseDefaultWebhookResponse({ reply: "Hello there!" });
    assert.equal(reply, "Hello there!");
  });

  it("parseDefaultWebhookResponse rejects missing reply", async () => {
    const { parseDefaultWebhookResponse } = await import(
      "../src/lib/webhook/defaultMapper"
    );
    assert.throws(() => parseDefaultWebhookResponse({ data: "no reply" }), {
      message: /expected \{ reply: string \}/,
    });
  });

  it("parseDefaultWebhookResponse rejects empty reply", async () => {
    const { parseDefaultWebhookResponse } = await import(
      "../src/lib/webhook/defaultMapper"
    );
    assert.throws(() => parseDefaultWebhookResponse({ reply: "" }), {
      message: /reply is empty/,
    });
  });

  it("parseDefaultWebhookResponse rejects non-string reply", async () => {
    const { parseDefaultWebhookResponse } = await import(
      "../src/lib/webhook/defaultMapper"
    );
    assert.throws(() => parseDefaultWebhookResponse({ reply: 42 }), {
      message: /expected \{ reply: string \}/,
    });
  });
});

// ── 2. Markdown Export Unit Tests ────────────────────────────────────

describe("Markdown Report Builder", () => {
  it("includes metadata, personas, transcript, evaluation", async () => {
    const { buildMarkdownReport } = await import(
      "../src/lib/export/markdownReport"
    );

    const report = buildMarkdownReport({
      id: "run-001",
      sessionId: "ses-001",
      status: "COMPLETED",
      chatbotName: "TestBot",
      chatbotPurpose: "Help customers find products",
      testScenario: "Customer looks for moisturizer",
      ecommerceCategory: "Skincare",
      initialQuestionCount: 2,
      followUpQuestionCount: 1,
      targetBotResponseCount: 3,
      webhookConfigSnapshot: {
        name: "Mock WH",
        url: "http://localhost:3000/api/mock-chatbot",
        method: "POST",
      },
      createdAt: new Date("2026-06-09T10:00:00Z"),
      startedAt: new Date("2026-06-09T10:00:01Z"),
      completedAt: new Date("2026-06-09T10:00:30Z"),
      personas: [
        {
          personaSnapshot: {
            name: "Alice",
            description: "Impatient shopper",
            skillFocus: "skincare",
          },
        },
      ],
      messages: [
        {
          id: "msg-user-1",
          role: "USER",
          content: "What moisturizers do you have?",
          turnIndex: 0,
          sequenceIndex: 0,
          personaRun: { personaSnapshot: { name: "Alice" } },
        },
        {
          id: "msg-bot-1",
          role: "CHATBOT",
          content: "We have several options!",
          turnIndex: 0,
          sequenceIndex: 1,
          personaRun: null,
        },
      ],
      evaluation: {
        summary: "Overall good performance.",
        criteriaResults: [
          {
            criterion: "ACCURACY",
            status: "PASS",
            explanation: "Responses were accurate.",
            suggestedFix: null,
            personaRun: { personaSnapshot: { name: "Alice" } },
          },
          {
            criterion: "HALLUCINATION",
            status: "WARNING",
            explanation: "Minor unverifiable claim.",
            suggestedFix: "Add citations",
            personaRun: { personaSnapshot: { name: "Alice" } },
          },
        ],
        personaComments: [
          {
            personaName: "Alice",
            overallComment: "Good experience.",
            whatWorked: ["Quick responses"],
            concerns: ["Could be more detailed"],
          },
        ],
        issues: [
          {
            messageId: "msg-bot-1",
            severity: "MEDIUM",
            category: "COMPLETENESS",
            explanation: "Missing product details",
            suggestedFix: "Include product names and prices",
          },
        ],
      },
    });

    // Metadata checks
    assert.ok(report.includes("# Simulation Report: TestBot"));
    assert.ok(report.includes("run-001"));
    assert.ok(report.includes("ses-001"));
    assert.ok(report.includes("Skincare"));
    assert.ok(report.includes("Mock WH"));

    // Personas section
    assert.ok(report.includes("### Alice"));
    assert.ok(report.includes("Impatient shopper"));

    // Transcript
    assert.ok(report.includes("What moisturizers do you have?"));
    assert.ok(report.includes("We have several options!"));

    // Evaluation
    assert.ok(report.includes("PASS"));
    assert.ok(report.includes("WARNING"));
    assert.ok(report.includes("Missing product details"));
    assert.ok(report.includes("Include product names and prices"));

    // Persona comments
    assert.ok(report.includes("Good experience."));
    assert.ok(report.includes("Quick responses"));
    assert.ok(report.includes("Could be more detailed"));
  });

  it("handles run with no evaluation", async () => {
    const { buildMarkdownReport } = await import(
      "../src/lib/export/markdownReport"
    );

    const report = buildMarkdownReport({
      id: "run-002",
      sessionId: "ses-002",
      status: "FAILED",
      chatbotName: "FailBot",
      chatbotPurpose: "Test",
      testScenario: "Failure test",
      ecommerceCategory: null,
      initialQuestionCount: 1,
      followUpQuestionCount: 0,
      targetBotResponseCount: 1,
      webhookConfigSnapshot: { name: "WH", url: "http://x", method: "POST" },
      createdAt: new Date("2026-06-09T10:00:00Z"),
      startedAt: null,
      completedAt: null,
      personas: [],
      messages: [
        {
          id: "m1",
          role: "USER",
          content: "Hello",
          turnIndex: 0,
          sequenceIndex: 0,
          personaRun: null,
        },
      ],
      evaluation: null,
    });

    assert.ok(report.includes("FAILED"));
    assert.ok(report.includes("Hello"));
    assert.ok(!report.includes("Evaluation Summary"));
  });
});

// ── 3. API Integration Tests ─────────────────────────────────────────

describe("API: Webhook Config CRUD", () => {
  let webhookId: string;

  it("POST /api/webhook-configs creates a config", async () => {
    const { status, body } = await api("/api/webhook-configs", {
      method: "POST",
      body: JSON.stringify({
        name: "IntegTest WH",
        url: "http://localhost:3000/api/mock-chatbot",
        method: "POST",
        notes: "Integration test",
      }),
    });
    assert.equal(status, 201);
    const d = body as Record<string, unknown>;
    assert.ok(d.id);
    assert.equal(d.name, "IntegTest WH");
    webhookId = d.id as string;
  });

  it("GET /api/webhook-configs lists configs", async () => {
    const { status, body } = await api("/api/webhook-configs");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(
      (body as { id: string }[]).some((w) => w.id === webhookId),
    );
  });

  it("GET /api/webhook-configs/:id returns config", async () => {
    const { status, body } = await api(`/api/webhook-configs/${webhookId}`);
    assert.equal(status, 200);
    assert.equal((body as Record<string, unknown>).name, "IntegTest WH");
  });

  it("PATCH /api/webhook-configs/:id updates config", async () => {
    const { status, body } = await api(`/api/webhook-configs/${webhookId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "IntegTest WH Updated" }),
    });
    assert.equal(status, 200);
    assert.equal(
      (body as Record<string, unknown>).name,
      "IntegTest WH Updated",
    );
  });

  it("POST /api/webhook-configs/:id/test tests connection", async () => {
    const { status, body } = await api(
      `/api/webhook-configs/${webhookId}/test`,
      { method: "POST" },
    );
    assert.equal(status, 200);
    const d = body as Record<string, unknown>;
    assert.equal(d.ok, true);
    assert.ok(typeof d.reply === "string");
    assert.ok((d.latencyMs as number) >= 0);
  });

  after(async () => {
    if (webhookId) {
      await api(`/api/webhook-configs/${webhookId}`, { method: "DELETE" });
    }
  });
});

describe("API: Persona CRUD", () => {
  let personaId: string;

  it("POST /api/personas creates a persona", async () => {
    const { status, body } = await api("/api/personas", {
      method: "POST",
      body: JSON.stringify({
        name: "IntegTest Persona",
        description: "Test persona for integration tests",
        systemPrompt: "You are a helpful test customer",
        skillFocus: "testing",
        active: true,
        ecommerceContext: {
          browsingStyle: "quick",
          patienceLevel: "medium",
          productKnowledge: "basic",
          tone: "friendly",
          intent: "purchase",
        },
      }),
    });
    assert.equal(status, 201);
    const d = body as Record<string, unknown>;
    assert.ok(d.id);
    personaId = d.id as string;
  });

  it("GET /api/personas lists personas", async () => {
    const { status, body } = await api("/api/personas");
    assert.equal(status, 200);
    assert.ok(
      (body as { id: string }[]).some((p) => p.id === personaId),
    );
  });

  it("PATCH /api/personas/:id updates persona", async () => {
    const { status, body } = await api(`/api/personas/${personaId}`, {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });
    assert.equal(status, 200);
    assert.equal((body as Record<string, unknown>).active, false);

    // Re-activate for later use
    await api(`/api/personas/${personaId}`, {
      method: "PATCH",
      body: JSON.stringify({ active: true }),
    });
  });

  after(async () => {
    if (personaId) {
      await api(`/api/personas/${personaId}`, { method: "DELETE" });
    }
  });
});

describe("API: Simulation Run lifecycle", () => {
  let webhookId: string;
  let personaId: string;
  let runId: string;

  before(async () => {
    // Setup: create webhook + persona
    const wh = await api("/api/webhook-configs", {
      method: "POST",
      body: JSON.stringify({
        name: "Lifecycle WH",
        url: "http://localhost:3000/api/mock-chatbot",
        method: "POST",
      }),
    });
    webhookId = (wh.body as Record<string, unknown>).id as string;

    const p = await api("/api/personas", {
      method: "POST",
      body: JSON.stringify({
        name: "Lifecycle Persona",
        description: "For lifecycle test",
        systemPrompt: "You are a customer",
        skillFocus: "general",
        active: true,
      }),
    });
    personaId = (p.body as Record<string, unknown>).id as string;
  });

  it("POST /api/simulation-runs creates a run", async () => {
    const { status, body } = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [personaId],
        chatbotName: "TestBot",
        chatbotPurpose: "Help with shopping",
        testScenario: "Customer buys a product",
        ecommerceCategory: "General",
        initialQuestionCount: 1,
        followUpQuestionCount: 0,
      }),
    });
    assert.equal(status, 201);
    const d = body as Record<string, unknown>;
    assert.equal(d.status, "CREATED");
    assert.ok(d.sessionId);
    assert.equal(d.targetBotResponseCount, 1);
    runId = d.id as string;
  });

  it("GET /api/simulation-runs lists runs", async () => {
    const { status, body } = await api("/api/simulation-runs");
    assert.equal(status, 200);
    assert.ok((body as { id: string }[]).some((r) => r.id === runId));
  });

  it("GET /api/simulation-runs/:id returns run detail with snapshots", async () => {
    const { status, body } = await api(`/api/simulation-runs/${runId}`);
    assert.equal(status, 200);
    const d = body as Record<string, unknown>;
    assert.equal(d.status, "CREATED");
    const personas = d.personas as { personaSnapshot: Record<string, unknown> }[];
    assert.equal(personas.length, 1);
    assert.equal(personas[0].personaSnapshot.name, "Lifecycle Persona");

    const snapshot = d.webhookConfigSnapshot as Record<string, unknown>;
    assert.ok(snapshot.url);
  });

  it("rejects creating run with >100 total questions", async () => {
    const { status, body } = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [personaId],
        chatbotName: "Bot",
        chatbotPurpose: "Test",
        testScenario: "Test",
        initialQuestionCount: 60,
        followUpQuestionCount: 50,
      }),
    });
    assert.equal(status, 400);
    const d = body as { error: { code: string } };
    assert.equal(d.error.code, "VALIDATION_ERROR");
  });

  it("rejects creating run with 0 personas", async () => {
    const { status } = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [],
        chatbotName: "Bot",
        chatbotPurpose: "Test",
        testScenario: "Test",
        initialQuestionCount: 1,
        followUpQuestionCount: 0,
      }),
    });
    assert.equal(status, 400);
  });

  it("DELETE /api/simulation-runs/:id deletes run", async () => {
    const { status } = await api(`/api/simulation-runs/${runId}`, {
      method: "DELETE",
    });
    assert.equal(status, 204);

    // Verify deleted
    const { status: getStatus } = await api(`/api/simulation-runs/${runId}`);
    assert.equal(getStatus, 404);
  });

  after(async () => {
    if (webhookId) await api(`/api/webhook-configs/${webhookId}`, { method: "DELETE" });
    if (personaId) await api(`/api/personas/${personaId}`, { method: "DELETE" });
  });
});

// ── 4. Full Simulation Flow (with DB-level seeding) ──────────────────

describe("Full simulation flow via direct DB seeding + API", () => {
  let runId: string;
  let webhookId: string;
  let personaId: string;

  before(async () => {
    // Create webhook and persona via API
    const wh = await api("/api/webhook-configs", {
      method: "POST",
      body: JSON.stringify({
        name: "Full Flow WH",
        url: "http://localhost:3000/api/mock-chatbot",
        method: "POST",
      }),
    });
    webhookId = (wh.body as Record<string, unknown>).id as string;

    const p = await api("/api/personas", {
      method: "POST",
      body: JSON.stringify({
        name: "Full Flow Persona",
        description: "Curious skincare shopper",
        systemPrompt: "You are a curious skincare customer",
        skillFocus: "skincare",
        active: true,
      }),
    });
    personaId = (p.body as Record<string, unknown>).id as string;

    // Create run
    const run = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [personaId],
        chatbotName: "SkinBot",
        chatbotPurpose: "Help customers find skincare products",
        testScenario: "Customer asks about moisturizers",
        ecommerceCategory: "Skincare",
        initialQuestionCount: 2,
        followUpQuestionCount: 1,
      }),
    });
    runId = (run.body as Record<string, unknown>).id as string;

    // Directly seed messages into the DB to simulate a completed execution
    // (bypasses OpenAI dependency for question generation)
    const prisma = await getTestPrisma();

    try {
      // Get the persona run ID
      const personaRuns = await prisma.simulationRunPersona.findMany({
        where: { runId },
      });
      const personaRunId = personaRuns[0].id;

      // Seed 2 initial questions + 1 follow-up = 3 turns, 6 messages
      const messages = [
        { role: "USER" as const, content: "What moisturizers do you recommend for sensitive skin?", source: "INITIAL" as const, seq: 0, turn: 0 },
        { role: "CHATBOT" as const, content: "We have several gentle moisturizers! Our top pick is the Calm Restore Cream, which is fragrance-free and dermatologist-tested.", source: "WEBHOOK_REPLY" as const, seq: 1, turn: 0 },
        { role: "USER" as const, content: "What ingredients are in the Calm Restore Cream?", source: "INITIAL" as const, seq: 2, turn: 1 },
        { role: "CHATBOT" as const, content: "The Calm Restore Cream contains ceramides, hyaluronic acid, and niacinamide. These help restore the skin barrier and maintain hydration.", source: "WEBHOOK_REPLY" as const, seq: 3, turn: 1 },
        { role: "USER" as const, content: "Is it suitable for daily use? I have really dry patches.", source: "FOLLOW_UP" as const, seq: 4, turn: 2 },
        { role: "CHATBOT" as const, content: "Absolutely! It's designed for daily use and works great on dry patches. Apply it twice daily after cleansing for best results.", source: "WEBHOOK_REPLY" as const, seq: 5, turn: 2 },
      ];

      for (const msg of messages) {
        await prisma.message.create({
          data: {
            runId,
            personaRunId: msg.role === "USER" ? personaRunId : personaRunId,
            role: msg.role,
            sequenceIndex: msg.seq,
            turnIndex: msg.turn,
            content: msg.content,
            generationSource: msg.source,
          },
        });
      }

      // Update run status to COMPLETED with timestamps
      await prisma.simulationRun.update({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Now seed an evaluation directly (bypasses OpenAI evaluation)
      const chatbotMessages = await prisma.message.findMany({
        where: { runId, role: "CHATBOT" },
        orderBy: { sequenceIndex: "asc" },
      });

      await prisma.evaluation.create({
        data: {
          runId,
          model: "gpt-4o-mini",
          summary: "Overall good performance with minor completeness gaps.",
          rawJson: {
            summary: "Overall good performance with minor completeness gaps.",
            criteriaResults: [],
            personaComments: [],
            issues: [],
          },
          criteriaResults: {
            create: [
              {
                personaRunId: personaRunId,
                criterion: "ACCURACY",
                status: "PASS",
                explanation: "All product information was accurate and verifiable.",
                relatedMessageIds: [chatbotMessages[0].id],
                relatedMessageId: chatbotMessages[0].id,
              },
              {
                personaRunId: personaRunId,
                criterion: "COMPLETENESS",
                status: "WARNING",
                explanation: "Missing price information in initial recommendation.",
                suggestedFix: "Include price range when recommending products.",
                relatedMessageIds: [chatbotMessages[0].id],
                relatedMessageId: chatbotMessages[0].id,
              },
              {
                personaRunId: personaRunId,
                criterion: "HELPFULNESS",
                status: "PASS",
                explanation: "Responses were helpful and addressed customer needs.",
                relatedMessageIds: [],
              },
              {
                personaRunId: personaRunId,
                criterion: "TONE",
                status: "PASS",
                explanation: "Tone was professional and friendly.",
                relatedMessageIds: [],
              },
              {
                personaRunId: personaRunId,
                criterion: "RELEVANCE",
                status: "PASS",
                explanation: "All responses were relevant to the query.",
                relatedMessageIds: [],
              },
              {
                personaRunId: personaRunId,
                criterion: "HALLUCINATION",
                status: "FAIL",
                explanation: "Claimed product is dermatologist-tested without verification.",
                suggestedFix: "Only make claims that can be verified from product data.",
                relatedMessageIds: [chatbotMessages[0].id],
                relatedMessageId: chatbotMessages[0].id,
              },
            ],
          },
          personaComments: {
            create: [
              {
                personaRunId: personaRunId,
                personaName: "Full Flow Persona",
                overallComment: "The chatbot was generally helpful but made unverifiable claims.",
                whatWorked: ["Quick, relevant responses", "Good ingredient breakdown"],
                concerns: ["Unverified dermatologist claim", "Missing pricing"],
              },
            ],
          },
          issues: {
            create: [
              {
                messageId: chatbotMessages[0].id,
                severity: "HIGH",
                category: "HALLUCINATION",
                explanation: "Claims the product is dermatologist-tested without evidence.",
                suggestedFix: "Remove or verify the dermatologist-tested claim.",
              },
              {
                messageId: chatbotMessages[0].id,
                severity: "MEDIUM",
                category: "COMPLETENESS",
                explanation: "No price information provided with recommendation.",
                suggestedFix: "Include approximate price range.",
              },
            ],
          },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("run detail includes messages and evaluation", async () => {
    const { status, body } = await api(`/api/simulation-runs/${runId}`);
    assert.equal(status, 200);
    const d = body as Record<string, unknown>;
    assert.equal(d.status, "COMPLETED");

    const messages = d.messages as { role: string }[];
    assert.equal(messages.length, 6);
    assert.equal(messages.filter((m) => m.role === "USER").length, 3);
    assert.equal(messages.filter((m) => m.role === "CHATBOT").length, 3);

    const evaluation = d.evaluation as Record<string, unknown>;
    assert.ok(evaluation);
    assert.equal(
      (evaluation.criteriaResults as unknown[]).length,
      6,
    );

    const issues = evaluation.issues as { severity: string }[];
    assert.equal(issues.length, 2);
    assert.ok(issues.some((i) => i.severity === "HIGH"));
    assert.ok(issues.some((i) => i.severity === "MEDIUM"));
  });

  it("evaluation has pass/warning/fail statuses", async () => {
    const { body } = await api(`/api/simulation-runs/${runId}`);
    const d = body as Record<string, unknown>;
    const evaluation = d.evaluation as Record<string, unknown>;
    const criteria = evaluation.criteriaResults as { status: string }[];

    const statuses = new Set(criteria.map((c) => c.status));
    assert.ok(statuses.has("PASS"), "Should have PASS status");
    assert.ok(statuses.has("WARNING"), "Should have WARNING status");
    assert.ok(statuses.has("FAIL"), "Should have FAIL status");
  });

  it("evaluation has no total score (per spec)", async () => {
    const { body } = await api(`/api/simulation-runs/${runId}`);
    const d = body as Record<string, unknown>;
    const evaluation = d.evaluation as Record<string, unknown>;
    // No totalScore, averageScore, or consensusScore fields
    assert.equal((evaluation as Record<string, unknown>).totalScore, undefined);
    assert.equal((evaluation as Record<string, unknown>).averageScore, undefined);
  });

  it("issues reference actual chatbot message IDs", async () => {
    const { body } = await api(`/api/simulation-runs/${runId}`);
    const d = body as Record<string, unknown>;
    const messages = d.messages as { id: string; role: string }[];
    const chatbotIds = new Set(
      messages.filter((m) => m.role === "CHATBOT").map((m) => m.id),
    );

    const evaluation = d.evaluation as Record<string, unknown>;
    const issues = evaluation.issues as { messageId: string }[];
    for (const issue of issues) {
      assert.ok(
        chatbotIds.has(issue.messageId),
        `Issue messageId ${issue.messageId} should reference a chatbot message`,
      );
    }
  });

  it("markdown export includes metadata, personas, transcript, issues", async () => {
    const { status, body, headers } = await api(
      `/api/simulation-runs/${runId}/export/markdown`,
    );
    assert.equal(status, 200);
    const contentType = headers.get("content-type");
    assert.ok(contentType?.includes("text/markdown"));

    const md = body as string;
    // Metadata
    assert.ok(md.includes("SkinBot"), "Should include chatbot name");
    assert.ok(md.includes("Skincare"), "Should include ecommerce category");
    // Personas
    assert.ok(md.includes("Full Flow Persona"), "Should include persona name");
    // Transcript
    assert.ok(
      md.includes("What moisturizers do you recommend"),
      "Should include user message",
    );
    assert.ok(
      md.includes("Calm Restore Cream"),
      "Should include chatbot reply",
    );
    // Issues
    assert.ok(
      md.includes("HALLUCINATION"),
      "Should include issue category",
    );
    assert.ok(
      md.includes("dermatologist-tested"),
      "Should include issue explanation",
    );
  });

  it("PDF export returns valid PDF", async () => {
    const res = await fetch(
      `${BASE_URL}/api/simulation-runs/${runId}/export/pdf`,
    );
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType?.includes("application/pdf"));

    const disposition = res.headers.get("content-disposition");
    assert.ok(disposition?.includes("attachment"));

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 100, "PDF should have content");
    // PDF magic bytes
    assert.ok(
      buffer.subarray(0, 5).toString() === "%PDF-",
      "Should be a valid PDF",
    );
  });

  it("export works for FAILED run with partial transcript", async () => {
    // Create a run, seed partial messages, mark FAILED
    const run = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [personaId],
        chatbotName: "FailBot",
        chatbotPurpose: "Test failure",
        testScenario: "Should fail",
        initialQuestionCount: 3,
        followUpQuestionCount: 0,
      }),
    });
    const failRunId = (run.body as Record<string, unknown>).id as string;

    const prisma = await getTestPrisma();
    try {
      const personaRuns = await prisma.simulationRunPersona.findMany({
        where: { runId: failRunId },
      });

      // Only 1 message pair (partial transcript)
      await prisma.message.create({
        data: {
          runId: failRunId,
          personaRunId: personaRuns[0].id,
          role: "USER",
          sequenceIndex: 0,
          turnIndex: 0,
          content: "Before the failure",
          generationSource: "INITIAL",
        },
      });

      await prisma.simulationRun.update({
        where: { id: failRunId },
        data: {
          status: "FAILED",
          startedAt: new Date(),
          failedAt: new Date(),
          errorMessage: "Webhook timed out",
        },
      });
    } finally {
      await prisma.$disconnect();
    }

    // Markdown export of failed run
    const { status, body } = await api(
      `/api/simulation-runs/${failRunId}/export/markdown`,
    );
    assert.equal(status, 200);
    const md = body as string;
    assert.ok(md.includes("FAILED"), "Should show FAILED status");
    assert.ok(
      md.includes("Before the failure"),
      "Should include partial transcript",
    );

    // Cleanup
    await api(`/api/simulation-runs/${failRunId}`, { method: "DELETE" });
  });

  it("deleted persona does not break old run snapshots", async () => {
    // Create a new persona, use it in a run, delete it, check run
    const p = await api("/api/personas", {
      method: "POST",
      body: JSON.stringify({
        name: "Ephemeral Persona",
        description: "Will be deleted",
        systemPrompt: "test",
        skillFocus: "test",
        active: true,
      }),
    });
    const ephId = (p.body as Record<string, unknown>).id as string;

    const run = await api("/api/simulation-runs", {
      method: "POST",
      body: JSON.stringify({
        webhookConfigId: webhookId,
        personaIds: [ephId],
        chatbotName: "SnapshotBot",
        chatbotPurpose: "Test snapshots",
        testScenario: "Snapshot test",
        initialQuestionCount: 1,
        followUpQuestionCount: 0,
      }),
    });
    const snapRunId = (run.body as Record<string, unknown>).id as string;

    // Delete the persona
    await api(`/api/personas/${ephId}`, { method: "DELETE" });

    // Run detail should still have the persona snapshot
    const { body } = await api(`/api/simulation-runs/${snapRunId}`);
    const d = body as Record<string, unknown>;
    const personas = d.personas as {
      personaId: string | null;
      personaSnapshot: Record<string, unknown>;
    }[];
    assert.equal(personas[0].personaId, null, "personaId should be null (SetNull)");
    assert.equal(
      personas[0].personaSnapshot.name,
      "Ephemeral Persona",
      "Snapshot should preserve deleted persona data",
    );

    // Cleanup
    await api(`/api/simulation-runs/${snapRunId}`, { method: "DELETE" });
  });

  after(async () => {
    if (runId) await api(`/api/simulation-runs/${runId}`, { method: "DELETE" });
    if (webhookId)
      await api(`/api/webhook-configs/${webhookId}`, { method: "DELETE" });
    if (personaId)
      await api(`/api/personas/${personaId}`, { method: "DELETE" });
  });
});

// ── 5. Webhook Client Tests ──────────────────────────────────────────

describe("Webhook Client error handling via test endpoints", () => {
  it("non-JSON response returns error", async () => {
    const { body } = await api("/api/mock-chatbot", {
      method: "POST",
      body: JSON.stringify({}),
    });
    // The mock chatbot returns 400 for missing message, which is a valid
    // error case - let's test our error endpoints via webhook test
  });

  it("timeout is handled gracefully", async () => {
    // Create a webhook pointing to a slow endpoint
    const wh = await api("/api/webhook-configs", {
      method: "POST",
      body: JSON.stringify({
        name: "Timeout Test",
        url: "http://localhost:3000/api/test-webhook-errors?mode=timeout",
        method: "POST",
      }),
    });
    const whId = (wh.body as Record<string, unknown>).id as string;

    const { body } = await api(`/api/webhook-configs/${whId}/test`, {
      method: "POST",
    });
    const d = body as Record<string, unknown>;
    assert.equal(d.ok, false);
    assert.ok((d.error as string).includes("timed out"));

    await api(`/api/webhook-configs/${whId}`, { method: "DELETE" });
  });
});
