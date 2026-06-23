import Parser from 'rss-parser';
import { RSS_SOURCES } from '@/config/sources';
import { summarizeStory } from './summarize';
import { supabaseAdmin } from './supabase';
import { Category, Story } from './types';

/**
 * Legal posture: we ingest ONLY title, excerpt/description, link, date and
 * source attribution from public RSS feeds. We never scrape full articles,
 * and every story links back to the original publisher.
 */

const parser = new Parser({ timeout: 10_000 });

function slugify(t: string): string {
  return (
    t.toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) +
    '-' +
    Math.abs(hash(t)).toString(36).slice(0, 5)
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ['ai', /\b(ai|artificial intelligence|kunstig intelligens|llm|chatgpt|claude|openai|anthropic)\b/i],
  ['technology', /\b(tech|app|software|chip|smartphone|cyber|data|robot)\b/i],
  ['business', /\b(økonomi|economy|market|børs|stocks|inflation|rente|interest rate|bank)\b/i],
  ['politics', /\b(election|valg|storting|parliament|government|regjering|minister|policy)\b/i],
  ['health', /\b(health|helse|hospital|sykehus|cancer|vaccine|disease)\b/i],
  ['science', /\b(research|forskning|study|studie|climate|klima|space|rom)\b/i],
  ['sport', /\b(sport|fotball|football|ski|champions league|olympi)\b/i],
  ['culture', /\b(film|music|musikk|festival|book|bok|tv|serie)\b/i],
];

function inferCategory(title: string, excerpt: string, fallback: Category): Category {
  const text = `${title} ${excerpt}`;
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return fallback;
}

function inferImportance(title: string, sourceTrust: number): number {
  const urgent = /\b(breaking|direkte|live|krig|war|crisis|krise|død|dead|attack|angrep|evacuat|emergency)\b/i.test(title);
  const base = Math.round(sourceTrust * 0.6) + 15;
  return Math.min(100, urgent ? base + 25 : base);
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  errors: { source: string; error: string }[];
  engine: string;
  mode: 'live' | 'no-database';
  ranAt: string;
}

export async function runIngestion(maxPerSource = 10): Promise<IngestResult> {
  const db = supabaseAdmin();
  const result: IngestResult = {
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    errors: [],
    engine: process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'mock',
    mode: db ? 'live' : 'no-database',
    ranAt: new Date().toISOString(),
  };

  for (const source of RSS_SOURCES.filter((s) => s.active)) {
    try {
      const feed = await parser.parseURL(source.rss_url);
      const items = (feed.items ?? []).slice(0, maxPerSource);
      result.fetched += items.length;
      if (!db) continue; // No database configured — report fetch counts only.

      for (const item of items) {
        const url = item.link?.trim();
        const title = stripHtml(item.title ?? '');
        if (!url || !title) continue;

        // Dedupe on original_url (unique constraint) — check first to save AI calls.
        const { data: existing } = await db.from('stories').select('id').eq('original_url', url).maybeSingle();
        if (existing) {
          result.duplicates++;
          continue;
        }

        const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 600);
        const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
        const category = inferCategory(title, excerpt, source.category);
        const importance = inferImportance(title, source.trust_level);

        const { bundle } = await summarizeStory({
          title,
          excerpt,
          source_name: source.name,
          source_url: url,
          category,
          published_at: publishedAt,
        });

        const row: Partial<Story> = {
          title,
          slug: slugify(title),
          original_url: url,
          source_name: source.name,
          source_domain: source.domain,
          category,
          region: source.region,
          language: source.language,
          published_at: new Date(publishedAt).toISOString(),
          fetched_at: new Date().toISOString(),
          image_url: (item.enclosure?.url as string | undefined) ?? null,
          original_excerpt: excerpt,
          ...bundle,
          importance_score: importance,
          novelty_score: 80,
          relevance_score: source.region === 'no' ? 75 : 60,
          status: 'published',
          is_demo: false,
        };

        const { error } = await db.from('stories').insert(row);
        if (error) {
          if (error.code === '23505') result.duplicates++;
          else result.errors.push({ source: source.name, error: error.message });
        } else {
          result.inserted++;
        }
      }

      await db
        .from('sources')
        .upsert(
          { ...source, last_fetched_at: new Date().toISOString(), last_status: 'ok' },
          { onConflict: 'rss_url' }
        );
    } catch (e: any) {
      result.errors.push({ source: source.name, error: e?.message ?? 'fetch failed' });
      if (db) {
        await db
          .from('sources')
          .upsert(
            { ...source, last_fetched_at: new Date().toISOString(), last_status: `error: ${e?.message ?? 'unknown'}` },
            { onConflict: 'rss_url' }
          );
      }
    }
  }
  return result;
}
