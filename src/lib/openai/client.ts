import OpenAI from "openai";
import { env } from "@/lib/env";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export function getModel(): string {
  return env.OPENAI_MODEL;
}
