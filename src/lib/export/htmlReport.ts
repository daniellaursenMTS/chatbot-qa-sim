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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHtmlReport(run: RunData): string {
  const issuesByMessageId = new Map<string, NonNullable<RunData["evaluation"]>["issues"]>();
  if (run.evaluation) {
    for (const issue of run.evaluation.issues) {
      const existing = issuesByMessageId.get(issue.messageId) ?? [];
      existing.push(issue);
      issuesByMessageId.set(issue.messageId, existing);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Simulation Report: ${esc(run.chatbotName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
  h2 { color: #2c3e50; margin-top: 30px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f8f9fa; font-weight: 600; }
  .msg { margin: 10px 0; padding: 10px 15px; border-radius: 8px; }
  .msg-user { background: #e3f2fd; border-left: 4px solid #2196f3; }
  .msg-chatbot { background: #f5f5f5; border-left: 4px solid #9e9e9e; }
  .msg-sender { font-weight: 600; font-size: 0.9em; color: #666; }
  .issue { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px; margin: 5px 0; font-size: 0.9em; }
  .issue-high { background: #f8d7da; border-color: #dc3545; }
  .issue-medium { background: #fff3cd; border-color: #ffc107; }
  .issue-low { background: #d1ecf1; border-color: #17a2b8; }
  .status-pass { color: #28a745; font-weight: 600; }
  .status-warning { color: #ffc107; font-weight: 600; }
  .status-fail { color: #dc3545; font-weight: 600; }
  .persona-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
</style>
</head>
<body>
<h1>Simulation Report: ${esc(run.chatbotName)}</h1>

<h2>Metadata</h2>
<table>
<tr><th>Run ID</th><td>${esc(run.id)}</td></tr>
<tr><th>Session ID</th><td>${esc(run.sessionId)}</td></tr>
<tr><th>Status</th><td>${esc(run.status)}</td></tr>
<tr><th>Chatbot</th><td>${esc(run.chatbotName)}</td></tr>
<tr><th>Purpose</th><td>${esc(run.chatbotPurpose)}</td></tr>
<tr><th>Scenario</th><td>${esc(run.testScenario)}</td></tr>
${run.ecommerceCategory ? `<tr><th>Category</th><td>${esc(run.ecommerceCategory)}</td></tr>` : ""}
<tr><th>Webhook</th><td>${esc(run.webhookConfigSnapshot.name)} (${esc(run.webhookConfigSnapshot.url)})</td></tr>
<tr><th>Questions</th><td>${run.initialQuestionCount} initial + ${run.followUpQuestionCount} follow-up = ${run.targetBotResponseCount} total</td></tr>
<tr><th>Created</th><td>${formatDateTime(run.createdAt)}</td></tr>
${run.startedAt ? `<tr><th>Started</th><td>${formatDateTime(run.startedAt)}</td></tr>` : ""}
${run.completedAt ? `<tr><th>Completed</th><td>${formatDateTime(run.completedAt)}</td></tr>` : ""}
</table>

<h2>Personas</h2>
${run.personas
  .map(
    (p) => `
<div class="persona-card">
  <h3>${esc(p.personaSnapshot.name)}</h3>
  <p><strong>Description:</strong> ${esc(p.personaSnapshot.description)}</p>
  <p><strong>Skill/focus:</strong> ${esc(p.personaSnapshot.skillFocus)}</p>
</div>`,
  )
  .join("")}

<h2>Transcript</h2>
${run.messages
  .map((msg) => {
    const sender =
      msg.role === "USER"
        ? (msg.personaRun?.personaSnapshot?.name ?? "Customer")
        : run.chatbotName;
    const cssClass = msg.role === "USER" ? "msg-user" : "msg-chatbot";
    const issues = issuesByMessageId.get(msg.id) ?? [];
    return `
<div class="msg ${cssClass}">
  <div class="msg-sender">[Turn ${msg.turnIndex}] ${esc(sender)} <span style="color:#aaa">(${msg.id.slice(0, 8)})</span></div>
  <p>${esc(msg.content)}</p>
  ${issues.map((i) => `<div class="issue issue-${i.severity.toLowerCase()}"><strong>${i.severity} ${i.category}:</strong> ${esc(i.explanation)}<br/><em>Fix: ${esc(i.suggestedFix)}</em></div>`).join("")}
</div>`;
  })
  .join("")}

${
  run.evaluation
    ? `
<h2>Evaluation Summary</h2>
${run.evaluation.summary ? `<p>${esc(run.evaluation.summary)}</p>` : ""}

<h3>Criteria Results</h3>
<table>
<tr><th>Persona</th><th>Criterion</th><th>Status</th><th>Explanation</th><th>Suggested Fix</th></tr>
${run.evaluation.criteriaResults
  .map(
    (cr) =>
      `<tr><td>${esc(cr.personaRun?.personaSnapshot?.name ?? "—")}</td><td>${esc(cr.criterion)}</td><td class="status-${cr.status.toLowerCase()}">${esc(cr.status)}</td><td>${esc(cr.explanation)}</td><td>${esc(cr.suggestedFix ?? "—")}</td></tr>`,
  )
  .join("")}
</table>

<h3>Persona Comments</h3>
${run.evaluation.personaComments
  .map(
    (pc) => `
<div class="persona-card">
  <h4>${esc(pc.personaName)}</h4>
  <p>${esc(pc.overallComment)}</p>
  ${pc.whatWorked.length > 0 ? `<p><strong>What worked:</strong></p><ul>${pc.whatWorked.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
  ${pc.concerns.length > 0 ? `<p><strong>Concerns:</strong></p><ul>${pc.concerns.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
</div>`,
  )
  .join("")}

${
  run.evaluation.issues.length > 0
    ? `
<h3>All Issues</h3>
<table>
<tr><th>Message ID</th><th>Severity</th><th>Category</th><th>Explanation</th><th>Suggested Fix</th></tr>
${run.evaluation.issues
  .map(
    (i) =>
      `<tr><td>${i.messageId.slice(0, 8)}</td><td>${esc(i.severity)}</td><td>${esc(i.category)}</td><td>${esc(i.explanation)}</td><td>${esc(i.suggestedFix)}</td></tr>`,
  )
  .join("")}
</table>`
    : ""
}`
    : ""
}

</body>
</html>`;
}
