import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoryBySlug } from '@/lib/stories';
import { CATEGORIES } from '@/lib/types';

/**
 * Public, shareable story page.
 *
 * This is where shared links land — so it is server-rendered with OpenGraph
 * tags (link previews in WhatsApp/Messenger/X) and always offers a way into
 * the app. The publisher is credited and linked throughout; the AI summary is
 * clearly labelled as a summary, never presented as original reporting.
 */

export const dynamic = 'force-dynamic';

function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const story = await getStoryBySlug(params.slug);
  if (!story) return { title: 'Story not found · Inifini' };

  const description = story.ai_short_summary || story.original_excerpt;
  return {
    title: `${story.title} — Inifini`,
    description,
    openGraph: {
      title: story.title,
      description,
      type: 'article',
      siteName: 'Inifini',
      publishedTime: story.published_at,
      images: story.image_url ? [{ url: story.image_url }] : undefined,
    },
    twitter: {
      card: story.image_url ? 'summary_large_image' : 'summary',
      title: story.title,
      description,
      images: story.image_url ? [story.image_url] : undefined,
    },
  };
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</h2>
      <div className="mt-2 font-serif text-[17px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

export default async function PublicStoryPage({ params }: { params: { slug: string } }) {
  const story = await getStoryBySlug(params.slug);
  if (!story) notFound();

  const date = new Date(story.published_at);

  return (
    <main className="px-5 pb-24 pt-6">
      <Link href="/" className="font-sans text-[13px] font-semibold text-accent">← Read more on Inifini</Link>

      <p className="mt-5 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        {categoryLabel(story.category)}
      </p>
      <h1 className="mt-2 font-serif text-[30px] font-bold leading-[1.1] tracking-[-0.015em]">{story.title}</h1>
      <p className="mt-3 font-sans text-[12px] text-muted">
        {story.source_name} · {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {story.image_url && (
        // Publisher/stock images come from many hosts and this page is
        // server-rendered for link previews — a plain <img> keeps it simple.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.image_url} alt="" className="mt-4 aspect-[16/9] w-full rounded-lg bg-rule object-cover" />
      )}

      <p className="mt-5 font-serif text-[19px] leading-relaxed">{story.ai_medium_summary || story.ai_short_summary}</p>

      {story.ai_key_points.length > 0 && (
        <Section label="What to know">
          <ul className="space-y-2">
            {story.ai_key_points.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink/60" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {story.ai_why_it_matters && <Section label="Why this matters">{story.ai_why_it_matters}</Section>}
      {story.ai_background && <Section label="Background">{story.ai_background}</Section>}
      {story.ai_what_next && <Section label="What may happen next">{story.ai_what_next}</Section>}

      <a
        href={story.original_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center justify-between rounded-md border border-ink/15 bg-white px-4 py-3.5 font-sans text-[14px] font-medium"
      >
        <span>Read the original at <span className="font-semibold">{story.source_name}</span></span>
        <span aria-hidden>→</span>
      </a>
      <p className="mt-2 font-sans text-[11px] text-muted">
        AI-assisted summary. {story.source_name} is the source of record.
      </p>

      {/* The way in: this page exists to turn a shared link into a reader. */}
      <aside className="mt-10 rounded-xl border border-rule bg-accentSoft/50 px-5 py-6 text-center">
        <p className="font-serif text-[22px] font-bold leading-snug">A calm paper that never runs out.</p>
        <p className="mx-auto mt-2 max-w-xs font-sans text-[14px] text-muted">
          Real reporting, credited and linked — scrolled the way you already scroll everything else.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-ink px-6 py-3 font-sans text-[14px] font-semibold text-paper">
          Open Inifini
        </Link>
      </aside>
    </main>
  );
}
