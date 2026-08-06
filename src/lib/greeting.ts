import { categoryPhrase, EditorProfile } from './affinity';
import { Story } from './types';

export interface Greeting {
  salutation: string;
  message: string;
}

/**
 * The generic fallback used whenever there's nothing genuinely personal to
 * say yet — a new reader, a signed-out one, or simply too little signal.
 * Several phrasings rather than one, and which one shows rotates by the day
 * (see `genericMessage`), so a reader who opens the tab daily doesn't see
 * the exact same line for weeks and stop registering it.
 */
const GENERIC_MESSAGES = [
  "I've prepared today's most important stories for you.",
  "Here's a calm overview of today's biggest developments.",
  "I've gathered today's key stories for you.",
];

const STRONG_SIGNAL = 45; // higher bar than a per-card reason — this is the first thing said, so it needs to be clearly true

function timeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function genericMessage(now: Date): string {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return GENERIC_MESSAGES[dayIndex % GENERIC_MESSAGES.length];
}

/**
 * Only speaks in terms the reader's own profile already backs up — reusing
 * the identical scores and threshold spirit as `explainRecommendation`, so
 * the greeting can never claim a stronger relationship with a topic than the
 * per-card reasons underneath it do. Returns null (falling through to the
 * generic line) rather than reaching for a category or source that isn't
 * actually well-established yet, or that today's stories don't back up.
 */
function personalizedMessage(profile: EditorProfile | null, stories: Story[]): string | null {
  if (!profile) return null;

  const category = profile.categories[0];
  if (category && category.score >= STRONG_SIGNAL) {
    const match = stories.filter((s) => s.category === category.id).sort((a, b) => b.importance_score - a.importance_score)[0];
    if (match) {
      const label = categoryPhrase(category.id, category.label);
      return `You've been reading a lot about ${label} lately — I've made sure today includes the latest on it.`;
    }
  }

  const source = profile.sources[0];
  if (source && source.score >= STRONG_SIGNAL) {
    const match = stories.find((s) => s.source_domain === source.domain);
    if (match) return `You tend to trust ${source.name} — one of today's top stories comes from them.`;
  }

  return null;
}

/**
 * The AI Editor's opening line for the day, not a chatbot greeting: a
 * newspaper editor meeting the reader at the top of the tab, once per visit.
 * `profile` being null means signed-out/demo reading or a profile that
 * hasn't loaded yet, not "no personalisation" — the caller is expected to
 * wait for that fetch to settle before calling this, same as
 * `explainRecommendation` already assumes further down the same tab.
 */
export function buildGreeting(opts: { name: string | null; profile: EditorProfile | null; stories: Story[]; now?: Date }): Greeting | null {
  if (opts.stories.length === 0) return null;
  const now = opts.now ?? new Date();
  const salutation = `Good ${timeOfDay(now.getHours())}${opts.name ? `, ${opts.name}` : ''}.`;
  const message = personalizedMessage(opts.profile, opts.stories) ?? genericMessage(now);
  return { salutation, message };
}
