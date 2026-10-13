import type { ExplanationPromptInput, AIProvider } from '../ai.types.js';
import { buildMessages } from '../prompt-builder.js';

export interface DigitalOceanConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  temperature: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fence ? (fence[1] ?? trimmed) : trimmed);
}

// OpenAI-compatible chat completions client for the DigitalOcean
// hosted inference endpoint. This adapter owns all provider-specific
// details (endpoint format, auth header, request/response shape);
// the rest of the module works with the AIProvider interface.
export class DigitalOceanProvider implements AIProvider {
  constructor(private readonly config: DigitalOceanConfig) {}

  async generateExplanation(input: ExplanationPromptInput): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: buildMessages(input),
          temperature: this.config.temperature,
          max_tokens: this.config.maxOutputTokens,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) throw new Error(`Inference provider returned HTTP ${response.status}`);
      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        throw new Error('Inference provider returned an empty response');
      }
      return extractJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }
}
