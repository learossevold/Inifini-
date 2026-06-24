import Parser from 'rss-parser';
import { RSS_SOURCES } from '@/config/sources';
import { summarizeStory } from './summarize';
import { supabaseAdmin } from './supabase';
import { Category, Story } from './types';

/**
 * Legal posture: we ingest ONLY title, excerpt/description, link, date and
 * source attribution from public RSS feeds. We never scrape full articles,
 * and every story links back to the original publisher.
 *
 * Performance posture (Vercel Hobby has a hard 60s function limit):
 *  - All feeds are fetched in parallel (Promise.allSettled), each with its own
 *    timeout, so one slow feed can never stall the whole run.
 *  - Duplicate detection is a single batched query, not one query per article.
 *  - No image API calls (e.g. Unsplash) happen in the loop — we use the image
 *    embedded in the feed, or a static per-category fallback.
 */

// rss-parser item shape with the media extensions we ask for below.
interface MediaNode {
  $?: { url?: string; medium?: string; type?: string };
}
interface RssItem {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: MediaNode | MediaNode[];
  mediaThumbnail?: MediaNode | MediaNode[];
}

const parser: Parser<unknown, RssItem> = new Parser({
  timeout: 10_000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
    ],
  },
});

// Static, royalty-free category fallback images (direct URLs — never an API call).
// Multiple images per category so articles in the same category don't all look
// identical. The article title hash is used to pick deterministically.
const CATEGORY_IMAGES: Record<Category, string[]> = {
  top: [
    'https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&w=1200',
  ],
  local: [
    'https://images.pexels.com/photos/1796715/pexels-photo-1796715.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/2422588/pexels-photo-2422588.jpeg?auto=compress&w=1200',
  ],
  norway: [
    'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1434608/pexels-photo-1434608.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3225528/pexels-photo-3225528.jpeg?auto=compress&w=1200',
  ],
  world: [
    'https://images.pexels.com/photos/2990650/pexels-photo-2990650.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1550337/pexels-photo-1550337.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/335393/pexels-photo-335393.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/6077368/pexels-photo-6077368.jpeg?auto=compress&w=1200',
  ],
  politics: [
    'https://images.pexels.com/photos/1056553/pexels-photo-1056553.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3573382/pexels-photo-3573382.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/5699516/pexels-photo-5699516.jpeg?auto=compress&w=1200',
  ],
  business: [
    'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/159888/pexels-photo-159888.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/936137/pexels-photo-936137.jpeg?auto=compress&w=1200',
  ],
  technology: [
    'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&w=1200',
  ],
  ai: [
    'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&w=1200',
  ],
  science: [
    'https://images.pexels.com/photos/3894157/pexels-photo-3894157.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1446076/pexels-photo-1446076.jpeg?auto=compress&w=1200',
  ],
  health: [
    'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/40751/running-runner-long-distance-fitness-40751.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/3622608/pexels-photo-3622608.jpeg?auto=compress&w=1200',
  ],
  culture: [
    'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/33129/popcorn-movie-party-entertainment.jpg?auto=compress&w=1200',
    'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&w=1200',
  ],
  sport: [
    'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/248547/pexels-photo-248547.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&w=1200',
  ],
  design: [
    'https://images.pexels.com/photos/1809644/pexels-photo-1809644.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/326501/pexels-photo-326501.jpeg?auto=compress&w=1200',
  ],
  art: [
    'https://images.pexels.com/photos/1572386/pexels-photo-1572386.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/20967/pexels-photo.jpg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&w=1200',
  ],
  travel: [
    'https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1051073/pexels-photo-1051073.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&w=1200',
  ],
};

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

// Human-readable labels for clearly marking headlines that link to a
// non-English-language source (the AI summary is always rewritten in English).
const LANGUAGE_LABELS: Record<string, string> = {
  no: 'Norwegian',
  nb: 'Norwegian',
  nn: 'Norwegian',
  da: 'Danish',
  sv: 'Swedish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
};

function markTitle(title: string, language: string): string {
  const lang = language?.toLowerCase();
  if (!lang || lang.startsWith('en')) return title;
  const label = LANGUAGE_LABELS[lang] ?? language.toUpperCase();
  // Avoid double-marking if a feed already includes the tag.
  return title.endsWith(`[${label}]`) ? title : `${title} [${label}]`;
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

function asMediaArray(node: MediaNode | MediaNode[] | undefined): MediaNode[] {
  if (!node) return [];
  return Array.isArray(node) ? node : [node];
}

function looksLikeImage(url: string | undefined, type?: string): url is string {
  if (!url) return false;
  if (type && type.startsWith('image/')) return true;
  if (type && !type.startsWith('image/')) return false;
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
}

function pickFallback(category: Category, title: string): string {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.world;
  return pool[Math.abs(hash(title)) % pool.length];
}

/** Pick the best available image for a feed item, falling back per category. */
function extractImage(item: RssItem, category: Category): string {
  const title = item.title ?? '';

  // 1. Standard <enclosure> image
  if (looksLikeImage(item.enclosure?.url, item.enclosure?.type)) return item.enclosure!.url!;

  // 2. <media:content> (often the highest-quality asset)
  for (const m of asMediaArray(item.mediaContent)) {
    const url = m.$?.url;
    if (url && (m.$?.medium === 'image' || looksLikeImage(url, m.$?.type))) return url;
  }

  // 3. <media:thumbnail>
  for (const m of asMediaArray(item.mediaThumbnail)) {
    if (m.$?.url) return m.$.url;
  }

  // 4. First <img> embedded in the description/content HTML
  const html = item.content ?? '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && /^https?:\/\//.test(match[1])) return match[1];

  // 5. Per-category fallback pool — picked deterministically by title hash
  //    so different articles get different images even in the same category.
  return pickFallback(category, title);
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  errors: { source: string; error: string }[];
  engine: string;
  mode: 'live' | 'no-database';
  ranAt: string;
  durationMs: number;
}

interface Candidate {
  sourceName: string;
  row: Partial<Story>;
  summaryInput: Parameters<typeof summarizeStory>[0];
}

/** Fetch one feed with a hard timeout so a hanging host can't blow the budget. */
async function fetchFeed(rssUrl: string, timeoutMs: number): Promise<RssItem[]> {
  const feed = (await Promise.race([
    parser.parseURL(rssUrl),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('feed timeout')), timeoutMs)),
  ])) as Awaited<ReturnType<typeof parser.parseURL>>;
  return (feed.items ?? []) as RssItem[];
}

export async function runIngestion(maxPerSource = 5): Promise<IngestResult> {
  const startedAt = Date.now();
  const db = supabaseAdmin();
  const result: IngestResult = {
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    errors: [],
    engine: process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'mock',
    mode: db ? 'live' : 'no-database',
    ranAt: new Date().toISOString(),
    durationMs: 0,
  };

  const sources = RSS_SOURCES.filter((s) => s.active);

  // ── 1. Fetch every feed in parallel; isolate failures per source. ──────────
  const feeds = await Promise.allSettled(sources.map((s) => fetchFeed(s.rss_url, 12_000)));

  // ── 2. Build candidate rows from successful feeds. ─────────────────────────
  const candidates: Candidate[] = [];
  feeds.forEach((res, i) => {
    const source = sources[i];
    if (res.status === 'rejected') {
      result.errors.push({ source: source.name, error: res.reason?.message ?? 'fetch failed' });
      return;
    }
    const items = res.value.slice(0, maxPerSource);
    result.fetched += items.length;

    for (const item of items) {
      const url = item.link?.trim();
      const rawTitle = stripHtml(item.title ?? '');
      if (!url || !rawTitle) continue;

      const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 600);
      const markedTitle = markTitle(rawTitle, source.language);
      const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
      const category = inferCategory(rawTitle, excerpt, source.category);
      const importance = inferImportance(rawTitle, source.trust_level);
      const image = extractImage(item, category);

      candidates.push({
        sourceName: source.name,
        summaryInput: {
          title: markedTitle,
          excerpt,
          source_name: source.name,
          source_url: url,
          category,
          published_at: publishedAt,
          language: source.language,
        },
        row: {
          // ai_title (English translation) will override this if the AI returns one
          title: markedTitle,
          slug: slugify(rawTitle),
          original_url: url,
          source_name: source.name,
          source_domain: source.domain,
          category,
          region: source.region,
          language: source.language,
          published_at: new Date(publishedAt).toISOString(),
          fetched_at: new Date().toISOString(),
          image_url: image,
          original_excerpt: excerpt,
          importance_score: importance,
          novelty_score: 80,
          relevance_score: source.region === 'no' ? 75 : 60,
          status: 'published',
          is_demo: false,
        },
      });
    }
  });

  // No database configured — report fetch counts only.
  if (!db) {
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // ── 3. Single batched duplicate check against original_url. ────────────────
  const urls = Array.from(new Set(candidates.map((c) => c.row.original_url!)));
  const existing = new Set<string>();
  if (urls.length) {
    const { data: dupes } = await db.from('stories').select('original_url').in('original_url', urls);
    for (const d of (dupes as { original_url: string }[] | null) ?? []) existing.add(d.original_url);
  }

  // Drop URLs already in the DB, and de-duplicate within this batch too.
  const seenInBatch = new Set<string>();
  const fresh = candidates.filter((c) => {
    const url = c.row.original_url!;
    if (existing.has(url) || seenInBatch.has(url)) {
      result.duplicates++;
      return false;
    }
    seenInBatch.add(url);
    return true;
  });

  // ── 4. Summarize fresh items in parallel (mock is instant; AI runs concurrently). ──
  const summaries = await Promise.all(fresh.map((c) => summarizeStory(c.summaryInput)));
  const rows = fresh.map((c, i) => {
    const { ai_title, ...bundle } = summaries[i].bundle;
    return {
      ...c.row,
      ...bundle,
      // Use the AI-translated English title when available; otherwise keep the original.
      ...(ai_title ? { title: ai_title, slug: slugify(ai_title) } : {}),
    };
  });

  // ── 5. One batched upsert. ignoreDuplicates guards against races without
  //        failing the whole batch on a single conflict. ──────────────────────
  if (rows.length) {
    const { data: insertedRows, error } = await db
      .from('stories')
      .upsert(rows, { onConflict: 'original_url', ignoreDuplicates: true })
      .select('id');
    if (error) {
      result.errors.push({ source: 'insert', error: error.message });
    } else {
      result.inserted = insertedRows?.length ?? 0;
    }
  }

  // ── 6. Record source health (single batched upsert). ───────────────────────
  const sourceStatus = sources.map((s, i) => ({
    ...s,
    last_fetched_at: new Date().toISOString(),
    last_status:
      feeds[i].status === 'fulfilled'
        ? 'ok'
        : `error: ${(feeds[i] as PromiseRejectedResult).reason?.message ?? 'unknown'}`,
  }));
  await db.from('sources').upsert(sourceStatus, { onConflict: 'rss_url' });

  result.durationMs = Date.now() - startedAt;
  return result;
}
