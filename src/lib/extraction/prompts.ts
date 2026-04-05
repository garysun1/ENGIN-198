import * as fs from 'fs';
import * as path from 'path';

const promptCache = new Map<string, string>();

function loadPrompt(name: string): string {
  if (promptCache.has(name)) return promptCache.get(name)!;

  const filePath = path.join(process.cwd(), 'prompts', `${name}.md`);
  const content = fs.readFileSync(filePath, 'utf-8');
  promptCache.set(name, content);
  return content;
}

export function getExtractionPrompt(vars: {
  source: string;
  docType: string;
  author: string;
  channel: string;
  createdAt: string;
  content: string;
}): string {
  let prompt = loadPrompt('extraction');
  for (const [key, value] of Object.entries(vars)) {
    prompt = prompt.replaceAll(`{${key}}`, value);
  }
  return prompt;
}

export function getSynthesisPrompt(vars: { context: string; query: string }): string {
  let prompt = loadPrompt('synthesis');
  for (const [key, value] of Object.entries(vars)) {
    prompt = prompt.replaceAll(`{${key}}`, value);
  }
  return prompt;
}
