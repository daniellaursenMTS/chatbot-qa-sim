// JSON Schema for Structured Outputs — used with OpenAI Responses API

export const initialQuestionsSchema = {
  type: "object" as const,
  properties: {
    questions: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: ["questions"] as const,
  additionalProperties: false as const,
};

export const followUpQuestionSchema = {
  type: "object" as const,
  properties: {
    question: { type: "string" as const },
  },
  required: ["question"] as const,
  additionalProperties: false as const,
};

export const evaluationSchema = {
  type: "object" as const,
  properties: {
    summary: { type: "string" as const },
    criteriaResults: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          personaName: { type: "string" as const },
          criterion: {
            type: "string" as const,
            enum: [
              "accuracy",
              "completeness",
              "helpfulness",
              "tone",
              "relevance",
              "hallucination",
            ],
          },
          status: {
            type: "string" as const,
            enum: ["pass", "warning", "fail"],
          },
          explanation: { type: "string" as const },
          suggestedFix: { type: "string" as const },
          relatedMessageIds: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
        required: [
          "personaName",
          "criterion",
          "status",
          "explanation",
          "relatedMessageIds",
        ] as const,
        additionalProperties: false as const,
      },
    },
    personaComments: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          personaName: { type: "string" as const },
          overallComment: { type: "string" as const },
          whatWorked: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          concerns: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
        required: [
          "personaName",
          "overallComment",
          "whatWorked",
          "concerns",
        ] as const,
        additionalProperties: false as const,
      },
    },
    issues: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          messageId: { type: "string" as const },
          severity: {
            type: "string" as const,
            enum: ["low", "medium", "high"],
          },
          category: {
            type: "string" as const,
            enum: [
              "accuracy",
              "completeness",
              "helpfulness",
              "tone",
              "relevance",
              "hallucination",
            ],
          },
          explanation: { type: "string" as const },
          suggestedFix: { type: "string" as const },
        },
        required: [
          "messageId",
          "severity",
          "category",
          "explanation",
          "suggestedFix",
        ] as const,
        additionalProperties: false as const,
      },
    },
  },
  required: [
    "summary",
    "criteriaResults",
    "personaComments",
    "issues",
  ] as const,
  additionalProperties: false as const,
};
