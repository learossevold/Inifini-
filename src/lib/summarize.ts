/**
 * AI summarization layer.
 * - Uses Anthropic if ANTHROPIC_API_KEY is set, otherwise OpenAI if OPENAI_API_KEY is set.
 * - Falls back to structured mock summaries with zero keys, so the app always works.
 *
 * Editorial rules enforced via prompt: no invented facts, no fake quotes,
 * no long copying, acknowledge limited source data, preserve attribution.
 */

export interface SummaryBundle {
  ai_short_summary: string;
  ai_medium_summary: string;
  ai_why_it_matters: string;
  ai_key_points: string[];
  ai_background: string;
  ai_what_next: string;
}

interface SummarizeInput {
  title: string;
  excerpt: string;
  source_name: string;
  source_url: string;
  category: string;
  published_at: string;
}

const SYSTEM_PROMPT = `You are an editorial summarizer for a calm, trustworthy digital newspaper.
You receive ONLY an RSS title and a short excerpt — never the full article.

Strict rules:
- Do not invent facts, numbers, names or quotes.
- Do not pretend to know more than the title/excerpt provides.
- If source data is thin, say so plainly (e.g. "according to the source feed", "details are limited").
- Never copy long passages. Rephrase in your own words.
- Always neutral, careful, non-sensational. No clickbait.
- Forward-looking sections must be cautious and clearly framed as outlook, not prediction.

Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{
  "ai_short_summary": "max 35 words",
  "ai_medium_summary": "max 120 words",
  "ai_why_it_matters": "1–2 sentences for a normal reader",
  "ai_key_points": ["3 to 5 short bullets"],
  "ai_background": "1–2 sentences of context, only what is safely general knowledge",
  "ai_what_next": "1–2 cautious sentences on what may happen next"
}`;

function userPrompt(input: SummarizeInput): string {
  return `Title: ${input.title}
Excerpt: ${input.excerpt || '(no excerpt provided)'}
Source: ${input.source_name} (${input.source_url})
Category: ${input.category}
Published: ${input.published_at}

Generate the JSON summary bundle.`;
}

function parseBundle(text: string): SummaryBundle | null {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const obj = JSON.parse(clean);
    if (!obj.ai_short_summary || !Array.isArray(obj.ai_key_points)) return null;
    return {
      ai_short_summary: String(obj.ai_short_summary),
      ai_medium_summary: String(obj.ai_medium_summary ?? ''),
      ai_why_it_matters: String(obj.ai_why_it_matters ?? ''),
      ai_key_points: obj.ai_key_points.slice(0, 5).map(String),
      ai_background: String(obj.ai_background ?? ''),
      ai_what_next: String(obj.ai_what_next ?? ''),
    };
  } catch {
    return null;
  }
}

async function summarizeWithAnthropic(input: SummarizeInput, apiKey: string): Promise<SummaryBundle | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(input) }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = (data.content ?? []).map((b: any) => b.text ?? '').join('');
  return parseBundle(text);
}

async function summarizeWithOpenAI(input: SummarizeInput, apiKey: string): Promise<SummaryBundle | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(input) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return parseBundle(data.choices?.[0]?.message?.content ?? '');
}

/** Honest, clearly-attributed fallback when no AI key exists. */
export function mockSummary(input: SummarizeInput): SummaryBundle {
  const excerpt = input.excerpt?.trim() || input.title;
  const firstSentence = excerpt.split(/(?<=[.!?])\s/)[0] ?? excerpt;
  return {
    ai_short_summary: firstSentence.split(/\s+/).slice(0, 35).join(' '),
    ai_medium_summary: `${excerpt.split(/\s+/).slice(0, 100).join(' ')} (Summary based on the ${input.source_name} feed excerpt; read the original for full reporting.)`,
    ai_why_it_matters: `This story was published by ${input.source_name} in the ${input.category} category. The feed excerpt is limited — open the original source for full context.`,
    ai_key_points: [
      `Reported by ${input.source_name}`,
      `Category: ${input.category}`,
      'Details limited to the public feed excerpt',
      'Original article linked below',
    ],
    ai_background: 'Background unavailable — this summary was generated without an AI key and uses only the public feed excerpt.',
    ai_what_next: 'Follow the original source for developments.',
  };
}

export async function summarizeStory(input: SummarizeInput): Promise<{ bundle: SummaryBundle; engine: 'anthropic' | 'openai' | 'mock' }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  try {
    if (anthropicKey) {
      const b = await summarizeWithAnthropic(input, anthropicKey);
      if (b) return { bundle: b, engine: 'anthropic' };
    }
    if (openaiKey) {
      const b = await summarizeWithOpenAI(input, openaiKey);
      if (b) return { bundle: b, engine: 'openai' };
    }
  } catch {
    // fall through to mock
  }
  return { bundle: mockSummary(input), engine: 'mock' };
}
