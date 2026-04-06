import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? '',
    timeout: 30_000,
  });
  return _client;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
}

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

export async function chatJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const client = getOpenRouterClient();

  const response = await client.chat.completions.create({
    model: getModel(),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as T;
}
