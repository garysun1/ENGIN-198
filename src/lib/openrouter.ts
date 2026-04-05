import OpenAI from 'openai';

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (_client) return _client;

  _client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://komori.demo',
      'X-Title': 'Kōmori Team Memory Graph',
    },
  });

  return _client;
}

export function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4';
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/**
 * One-shot chat completion. Returns the assistant message content.
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const client = getOpenRouterClient();

  const response = await client.chat.completions.create({
    model: getModel(),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

/**
 * JSON extraction call — wraps chat() and parses the result.
 * Throws if the response is not valid JSON.
 */
export async function chatJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const raw = await chat(systemPrompt, userMessage, options);

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  return JSON.parse(cleaned) as T;
}
