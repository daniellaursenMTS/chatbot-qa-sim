import { formatDateTime } from "@/lib/utils/dates";

interface RunData {
  id: string;
  sessionId: string;
  status: string;
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory: string | null;
  initialQuestionCount: number;
  followUpQuestionCount: number;
  targetBotResponseCount: number;
  webhookConfigSnapshot: { name: string; url: string; method: string };
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  personas: {
    personaSnapshot: { name: string; description: string; skillFocus: string };
  }[];
  messages: {
    id: string;
    role: string;
    content: string;
    turnIndex: number;
    sequenceIndex: number;
    personaRun?: { personaSnapshot: { name: string } } | null;
  }[];
  evaluation?: {
    summary: string | null;
    criteriaResults: {
      criterion: string;
      status: string;
      explanation: string;
      suggestedFix: string | null;
      personaRun?: { personaSnapshot: { name: string } } | null;
    }[];
    personaComments: {
      personaName: string;
      overallComment: string;
      whatWorked: string[];
      concerns: string[];
    }[];
    issues: {
      messageId: string;
      severity: string;
      category: string;
      explanation: string;
      suggestedFix: string;
    }[];
  } | null;
}

export function buildMarkdownReport(run: RunData): string {
  const lines: string[] = [];

  lines.push(`# Simulation Report: ${run.chatbotName}`);
  lines.push("");

  // Metadata
  lines.push("## Metadata");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Run ID | ${run.id} |`);
  lines.push(`| Session ID | ${run.sessionId} |`);
  lines.push(`| Status | ${run.status} |`);
  lines.push(`| Chatbot | ${run.chatbotName} |`);
  lines.push(`| Purpose | ${run.chatbotPurpose} |`);
  lines.push(`| Scenario | ${run.testScenario} |`);
  if (run.ecommerceCategory)
    lines.push(`| Category | ${run.ecommerceCategory} |`);
  lines.push(
    `| Webhook | ${run.webhookConfigSnapshot.name} (${run.webhookConfigSnapshot.url}) |`,
  );
  lines.push(`| Initial questions | ${run.initialQuestionCount} |`);
  lines.push(`| Follow-up questions | ${run.followUpQuestionCount} |`);
  lines.push(`| Target bot responses | ${run.targetBotResponseCount} |`);
  lines.push(`| Created | ${formatDateTime(run.createdAt)} |`);
  if (run.startedAt)
    lines.push(`| Started | ${formatDateTime(run.startedAt)} |`);
  if (run.completedAt)
    lines.push(`| Completed | ${formatDateTime(run.completedAt)} |`);
  lines.push("");

  // Personas
  lines.push("## Personas");
  lines.push("");
  for (const p of run.personas) {
    const snap = p.personaSnapshot;
    lines.push(`### ${snap.name}`);
    lines.push("");
    lines.push(`- **Description:** ${snap.description}`);
    lines.push(`- **Skill/focus:** ${snap.skillFocus}`);
    lines.push("");
  }

  // Transcript
  lines.push("## Transcript");
  lines.push("");
  const issuesByMessageId = new Map<string, { messageId: string; severity: string; category: string; explanation: string; suggestedFix: string }[]>();
  if (run.evaluation) {
    for (const issue of run.evaluation.issues) {
      const existing = issuesByMessageId.get(issue.messageId) ?? [];
      existing.push(issue);
      issuesByMessageId.set(issue.messageId, existing);
    }
  }

  for (const msg of run.messages) {
    const sender =
      msg.role === "USER"
        ? (msg.personaRun?.personaSnapshot?.name ?? "Customer")
        : run.chatbotName;
    lines.push(
      `**[Turn ${msg.turnIndex}] ${sender}** (${msg.id.slice(0, 8)}):`,
    );
    lines.push(`> ${msg.content}`);

    // Show issues for this message
    const msgIssues = issuesByMessageId.get(msg.id);
    if (msgIssues && msgIssues.length > 0) {
      lines.push("");
      for (const issue of msgIssues) {
        lines.push(
          `> ⚠️ **${issue.severity.toUpperCase()} ${issue.category}**: ${issue.explanation}`,
        );
        lines.push(`> 💡 Fix: ${issue.suggestedFix}`);
      }
    }
    lines.push("");
  }

  // Evaluation
  if (run.evaluation) {
    lines.push("## Evaluation Summary");
    lines.push("");
    if (run.evaluation.summary) {
      lines.push(run.evaluation.summary);
      lines.push("");
    }

    // Criteria Results
    lines.push("### Criteria Results");
    lines.push("");
    lines.push(
      "| Persona | Criterion | Status | Explanation | Suggested Fix |",
    );
    lines.push("|---------|-----------|--------|-------------|---------------|");
    for (const cr of run.evaluation.criteriaResults) {
      const persona = cr.personaRun?.personaSnapshot?.name ?? "—";
      lines.push(
        `| ${persona} | ${cr.criterion} | ${cr.status} | ${cr.explanation.slice(0, 80)} | ${cr.suggestedFix?.slice(0, 60) ?? "—"} |`,
      );
    }
    lines.push("");

    // Persona comments
    lines.push("### Persona Comments");
    lines.push("");
    for (const pc of run.evaluation.personaComments) {
      lines.push(`#### ${pc.personaName}`);
      lines.push("");
      lines.push(pc.overallComment);
      lines.push("");
      if (pc.whatWorked.length > 0) {
        lines.push("**What worked:**");
        for (const w of pc.whatWorked) lines.push(`- ${w}`);
        lines.push("");
      }
      if (pc.concerns.length > 0) {
        lines.push("**Concerns:**");
        for (const c of pc.concerns) lines.push(`- ${c}`);
        lines.push("");
      }
    }

    // Issues
    if (run.evaluation.issues.length > 0) {
      lines.push("### Issues");
      lines.push("");
      lines.push(
        "| Message ID | Severity | Category | Explanation | Suggested Fix |",
      );
      lines.push(
        "|------------|----------|----------|-------------|---------------|",
      );
      for (const issue of run.evaluation.issues) {
        lines.push(
          `| ${issue.messageId.slice(0, 8)} | ${issue.severity} | ${issue.category} | ${issue.explanation.slice(0, 80)} | ${issue.suggestedFix.slice(0, 60)} |`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
