/**
 * AI summarization layer.
 * - Uses Anthropic if ANTHROPIC_API_KEY is set, otherwise OpenAI if OPENAI_API_KEY is set.
 * - Falls back to structured mock summaries with zero keys, so the app always works.
 *
 * Editorial rules enforced via prompt: no invented facts, no fake quotes,
 * no long copying, acknowledge limited source data, preserve attribution.
 */

export interface SummaryBundle {
  ai_title?: string; // English translation of the title (only set for non-English sources)
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
  language?: string; // BCP-47 language code, e.g. 'no', 'en'
}

const SYSTEM_PROMPT = `You are an editorial summarizer for a calm, trustworthy digital newspaper.
You receive ONLY an RSS title and a short excerpt — never the full article.

Strict rules:
- Always write every field in English. If the title or excerpt is in another language (e.g. Norwegian), translate it accurately into natural English — never leave non-English text in the output.
- Do not invent facts, numbers, names or quotes.
- Do not pretend to know more than the title/excerpt provides.
- If source data is thin, say so plainly (e.g. "according to the source feed", "details are limited").
- Never copy long passages. Rephrase in your own words.
- Always neutral, careful, non-sensational. No clickbait.
- Forward-looking sections must be cautious and clearly framed as outlook, not prediction.

Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{
  "ai_title": "English title (only include this field if the original title is not in English)",
  "ai_short_summary": "One punchy sentence, max 40 words — used as the card teaser",
  "ai_medium_summary": "Rich summary of 200–300 words written as flowing prose (no bullet points). Extract and present every meaningful detail from the excerpt. Explain who did what, why it matters, what the numbers/facts say, and what is still unknown. Write as a skilled journalist summarising the story for a reader who has never heard of it.",
  "ai_why_it_matters": "2–3 sentences explaining the real-world significance — be specific about who is affected and how",
  "ai_key_points": ["5 specific, fact-rich bullets each 12–20 words, drawn directly from the excerpt"],
  "ai_background": "3–4 sentences of relevant context a newcomer to the topic would need. Use only safely established general knowledge, not speculation.",
  "ai_what_next": "2–3 cautious sentences on what may plausibly happen next, clearly framed as outlook not prediction"
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
      ...(obj.ai_title ? { ai_title: String(obj.ai_title) } : {}),
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
      max_tokens: 1800,
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
      max_tokens: 1800,
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

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function clampWords(text: string, max: number): string {
  const words = text.split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(' ').replace(/[,;:]$/, '') + '…';
}

function ensurePeriod(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

const CATEGORY_STAKES: Record<string, string> = {
  ai: 'how AI tools are built, governed and used',
  technology: 'the products and platforms people rely on every day',
  business: 'markets, jobs and household finances',
  politics: 'policy decisions that affect everyday life',
  health: 'public health and the choices people make about it',
  science: 'what we understand about the world around us',
  sport: 'fans, clubs and the wider sporting calendar',
  culture: 'what people watch, read and listen to',
  world: 'communities and decisions well beyond one country',
  norway: 'daily life and policy in Norway',
  local: 'people in the immediate area',
  business_default: 'readers following this story',
};

/**
 * Structured fallback used when no AI key is configured.
 *
 * It draws ONLY on the RSS excerpt — no invented facts — but presents it as a
 * fuller, English-language read: a lead, the body of the excerpt, real key
 * points pulled from its own sentences, and clearly-framed outlook. There is no
 * "read the original" filler; the source link lives in the UI instead.
 */
export function mockSummary(input: SummarizeInput): SummaryBundle {
  const source = input.source_name;
  const excerpt = (input.excerpt ?? '').trim();
  const sentences = splitSentences(excerpt);
  const lead = sentences[0] ?? input.title.trim();
  const stake = CATEGORY_STAKES[input.category] ?? CATEGORY_STAKES.business_default;

  // Short: the lead sentence, capped for a glanceable card.
  const ai_short_summary = clampWords(ensurePeriod(lead), 35);

  // Medium: the full excerpt as clean prose, framed in English, naturally
  // expanded with a neutral lead-in and a clearly-labelled outlook sentence.
  const body = excerpt ? ensurePeriod(excerpt) : ensurePeriod(input.title);
  const ai_medium_summary = `${source} reports: ${body} This summary reflects the information available in the public feed, and the story may continue to develop.`;

  // Key points: drawn from the excerpt's actual sentences where possible.
  const fromSentences = sentences.slice(0, 4).map((s) => clampWords(ensurePeriod(s), 22));
  const ai_key_points =
    fromSentences.length >= 2
      ? fromSentences
      : [
          clampWords(ensurePeriod(lead), 22),
          `Reported by ${source}.`,
          `Filed under ${input.category}.`,
        ];

  const ai_why_it_matters = `It speaks to ${stake}, which is why ${source} is covering it.`;

  // Background: use later sentences of the excerpt if any carry context;
  // otherwise stay honest about the limits of a feed-only summary.
  const ai_background =
    sentences.length > 1
      ? ensurePeriod(sentences.slice(1).join(' '))
      : 'This summary is built from the public feed excerpt alone, so wider context is limited.';

  const ai_what_next = `Watch ${source} for updates as more detail becomes available.`;

  return {
    ai_short_summary,
    ai_medium_summary,
    ai_why_it_matters,
    ai_key_points,
    ai_background,
    ai_what_next,
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
