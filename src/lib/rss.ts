import Parser from 'rss-parser';
import { RSS_SOURCES } from '@/config/sources';
import { upgradeImageUrl } from './images';
import { supabaseAdmin } from './supabase';
import { Category, Story } from './types';

/**
 * Legal posture: we ingest ONLY title, excerpt/description, link, date and
 * source attribution from public RSS feeds. We never scrape full articles,
 * and every story links back to the original publisher.
 *
 * Performance posture (Vercel Hobby has a hard 60s function limit, and its
 * own Cron Jobs feature is capped at once a day — which is why an external
 * scheduler like cron-job.org is what actually drives this):
 *
 *  Ingestion is two decoupled phases, not one:
 *   1. runIngestion() (this file) — fetch every feed in parallel
 *      (Promise.allSettled), each with its own timeout so one slow host can
 *      never stall the run, dedupe with a single batched query, and insert
 *      rows with status: 'pending'. No AI calls happen here, so this phase's
 *      wall time is bounded by the slowest single feed fetch (worst case
 *      ~12s) regardless of how many new articles showed up — it stays well
 *      inside 60s whether it's the 20th run of the day or the very first
 *      (cold-start) run against an empty table.
 *   2. /api/ingest/summarize — a separate endpoint, on its own cron-job.org
 *      schedule (every 1-5 minutes), that pulls a small batch of 'pending'
 *      rows, calls the AI summarizer on just that batch, and flips them to
 *      'published'. This is the same bounded-batch-plus-"remaining"-count
 *      shape /api/ingest/narrate and /api/ingest/resummarize already use —
 *      the summarization calls are what could plausibly run long or hit a
 *      provider rate limit, and a small fixed batch keeps any single
 *      invocation safely under the cap. It drains a burst of new pending
 *      rows over a few ticks rather than trying to do it all in one call.
 *
 *  A 'pending' row is invisible to readers automatically: the app's read
 *  queries (see getFeed in lib/stories.ts) and the anon RLS policy on
 *  `stories` both already filter on status = 'published', so nothing extra
 *  was needed to hide half-finished rows from the feed.
 *
 *  Unsplash image lookups stay in this phase (not moved to the summarize
 *  batch): each is capped at 3s and run in parallel across candidates via
 *  Promise.all, so the slowest one — not the count of them — sets the added
 *  time, which stays small next to the AI calls this split was for.
 */

// rss-parser item shape with the media extensions we ask for below.
interface MediaNode {
  $?: { url?: string; medium?: string; type?: string; width?: string; height?: string };
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

export function slugify(t: string): string {
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

/**
 * Feeds occasionally carry dates JS cannot parse. `new Date(bad).toISOString()`
 * throws RangeError, which previously aborted the entire ingestion run over a
 * single malformed item — so fall back to "now" instead.
 */
function safeIsoDate(value: string | undefined): string {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
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

function widthOf(m: MediaNode): number {
  const w = Number(m.$?.width);
  return Number.isFinite(w) ? w : 0;
}

/**
 * Best available image for a feed item, or null when there is none (the caller
 * substitutes a sharp category image). Prefers the largest asset offered rather
 * than the first, which is often the smallest thumbnail in the list.
 */
function extractRssImage(item: RssItem): string | null {
  const candidates: { url: string; width: number }[] = [];

  if (looksLikeImage(item.enclosure?.url, item.enclosure?.type)) {
    candidates.push({ url: item.enclosure!.url!, width: 0 });
  }
  for (const m of asMediaArray(item.mediaContent)) {
    const url = m.$?.url;
    if (url && (m.$?.medium === 'image' || looksLikeImage(url, m.$?.type))) {
      candidates.push({ url, width: widthOf(m) });
    }
  }
  for (const m of asMediaArray(item.mediaThumbnail)) {
    if (m.$?.url) candidates.push({ url: m.$.url, width: widthOf(m) });
  }
  const match = (item.content ?? '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && /^https?:\/\//.test(match[1])) {
    candidates.push({ url: match[1], width: 0 });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return upgradeImageUrl(candidates[0].url);
}

/**
 * Search Unsplash for a landscape photo relevant to the article title.
 * Returns the `regular` URL (1080px wide) or null on any failure.
 * Hard timeout of 3 s so it never stalls the ingestion loop.
 */
async function unsplashImage(title: string, apiKey: string): Promise<string | null> {
  try {
    // Use the first 5 words as the search query for relevance without noise.
    const query = encodeURIComponent(title.split(/\s+/).slice(0, 5).join(' '));
    const url = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${apiKey}`;
    const res = await Promise.race([
      fetch(url),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('unsplash timeout')), 3_000)),
    ]);
    if (!res.ok) return null;
    const data = await res.json() as { urls?: { regular?: string } };
    return data?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

export interface IngestResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  errors: { source: string; error: string }[];
  // The engine configured to summarize the pending queue this run just
  // added to — not what this run itself did, since summarization now
  // happens in a separate batch (see /api/ingest/summarize).
  engine: string;
  mode: 'live' | 'no-database';
  ranAt: string;
  durationMs: number;
}

interface Candidate {
  sourceName: string;
  row: Partial<Story>;
  needsImage: boolean; // true = no RSS image found, try Unsplash
}

/** Fetch one feed with a hard timeout so a hanging host can't blow the budget. */
async function fetchFeed(rssUrl: string, timeoutMs: number): Promise<RssItem[]> {
  const feed = (await Promise.race([
    parser.parseURL(rssUrl),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('feed timeout')), timeoutMs)),
  ])) as Awaited<ReturnType<typeof parser.parseURL>>;
  return (feed.items ?? []) as RssItem[];
}

export async function runIngestion(maxPerSource = 8): Promise<IngestResult> {
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
  // Sport feeds publish far more often than the others (every fixture is an
  // item), so an equal per-source cap let sport quietly eat a fifth of every
  // run and cluster at the top of "recently imported" simply by being
  // freshest. Capping it below the general limit keeps it in proportion with
  // how much of the paper it should actually be.
  const SPORT_CAP = 3;
  const candidates: Candidate[] = [];
  feeds.forEach((res, i) => {
    const source = sources[i];
    if (res.status === 'rejected') {
      result.errors.push({ source: source.name, error: res.reason?.message ?? 'fetch failed' });
      return;
    }
    const perSourceLimit = source.category === 'sport' ? Math.min(maxPerSource, SPORT_CAP) : maxPerSource;
    const items = res.value.slice(0, perSourceLimit);
    result.fetched += items.length;

    for (const item of items) {
      // One malformed item must never take down the whole run.
      try {
        const url = item.link?.trim();
        const rawTitle = stripHtml(item.title ?? '');
        if (!url || !rawTitle) continue;

        const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 1200);
        const markedTitle = markTitle(rawTitle, source.language);
        const publishedAt = safeIsoDate(item.isoDate ?? item.pubDate);
        const category = inferCategory(rawTitle, excerpt, source.category);
        const importance = inferImportance(rawTitle, source.trust_level);
        const rssImage = extractRssImage(item);
        const image = rssImage ?? pickFallback(category, rawTitle);

        candidates.push({
          sourceName: source.name,
          needsImage: rssImage === null,
          row: {
            // ai_title (English translation) will override this once the
            // summarize batch (see /api/ingest/summarize) picks this row up
            // — the ai_* fields all stay at their DB default ('' / []) until
            // then, and status: 'pending' keeps it out of every read query
            // and out of the anon RLS policy until that happens.
            title: markedTitle,
            slug: slugify(rawTitle),
            original_url: url,
            source_name: source.name,
            source_domain: source.domain,
            category,
            region: source.region,
            language: source.language,
            published_at: publishedAt,
            fetched_at: new Date().toISOString(),
            image_url: image,
            original_excerpt: excerpt,
            importance_score: importance,
            novelty_score: 80,
            relevance_score: source.region === 'no' ? 75 : 60,
            status: 'pending',
            is_demo: false,
          },
        });
      } catch (e: any) {
        result.errors.push({ source: source.name, error: `item skipped: ${e?.message ?? 'unknown'}` });
      }
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

  // ── 4. Unsplash image lookup, for candidates with no RSS image. No AI
  //        summarization here — that's /api/ingest/summarize's job, run
  //        against the 'pending' rows this inserts, in its own small
  //        batches. Each lookup is capped at 3s and all run in parallel, so
  //        this step's cost is that one worst-case lookup, not the count of
  //        them. ─────────────────────────────────────────────────────────
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const unsplashImages = await Promise.all(fresh.map((c) =>
    c.needsImage && unsplashKey
      ? unsplashImage(c.row.title!, unsplashKey)
      : Promise.resolve(null)
  ));

  const rows = fresh.map((c, i) => ({
    ...c.row,
    // Use Unsplash image if we got one, otherwise keep the Pexels fallback.
    ...(unsplashImages[i] ? { image_url: unsplashImages[i] } : {}),
  }));

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

  // upsert never removes rows, so a source deleted from config stays in the
  // table forever showing stale "no runs yet" status. Prune anything whose
  // URL is no longer in RSS_SOURCES — checked against the full config, active
  // or not, so a source only temporarily switched off doesn't lose its row.
  const configuredUrls = RSS_SOURCES.map((s) => s.rss_url);
  if (configuredUrls.length) {
    await db.from('sources').delete().not('rss_url', 'in', `(${configuredUrls.map((u) => `"${u}"`).join(',')})`);
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}
