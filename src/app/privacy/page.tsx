import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · Inifini',
  description: 'What Inifini collects, why, and the control you have over it.',
};

/**
 * Required for App Store review and by GDPR. Kept specific to what the app
 * actually does — no boilerplate about data we do not collect.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-[20px] font-bold leading-snug">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="px-5 pb-16 pt-6">
      <Link href="/profile" className="font-sans text-[13px] font-semibold text-accent">← Back to profile</Link>

      <h1 className="mt-5 font-serif text-[30px] font-bold leading-tight">Privacy Policy</h1>
      <p className="mt-2 text-[13px] text-muted">Last updated: 28 July 2026</p>

      <p className="mt-5 text-[15px] leading-relaxed text-ink/85">
        Inifini is a news reader with a small, private friends layer. This page explains exactly what we
        store, why, and how to get rid of it. We do not sell your data, and we do not run advertising
        trackers.
      </p>

      <Section title="Reading without an account">
        <p>
          You can browse Watch, News and Explore without signing up. In that state we store nothing about
          you personally. Our hosting provider keeps ordinary server logs (IP address, browser type, pages
          requested) for security and troubleshooting, as any website does.
        </p>
      </Section>

      <Section title="What we store if you create an account">
        <p>Sign-in uses a link emailed to you, so there is no password to store. Once you have an account we keep:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Your email address, used only to sign you in.</li>
          <li>Your username and display name, which other users can see.</li>
          <li>The topics and news outlets you follow, to build your Explore feed.</li>
          <li>Stories you save and like.</li>
          <li>Comments you post, which are public to other users.</li>
          <li>Friend connections, and the messages you send and receive.</li>
          <li>People you have blocked.</li>
        </ul>
      </Section>

      <Section title="Notifications">
        <p>
          If you turn on the morning brief, your browser generates an anonymous subscription that lets us
          send you one notification a day. It contains no personal information, and you can turn it off at
          any time from your profile, which deletes it.
        </p>
      </Section>

      <Section title="Who can see what">
        <p>
          Friendships are mutual and private — there are no public follower counts, and nobody can see who
          your friends are. Direct messages are visible only to you and the person you are writing to.
          Comments are public to signed-in users. Like counts are shown as totals only, never as a list of
          who liked something.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Nobody, other than the services that run the app: our hosting provider, our database provider, and
          the AI provider that writes story summaries. Summaries are generated from publishers&rsquo; public
          headlines and excerpts — your personal data is never sent to the AI provider.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under the GDPR you can access, correct, export or delete your data. You can delete your account
          yourself at any time from your profile — this permanently removes your profile, interests, saves,
          likes, comments, friendships, messages and notification settings. It cannot be undone.
        </p>
        <p>
          For anything else, or to request a copy of your data, email{' '}
          <a href="mailto:lea@indrearne.com" className="font-medium text-accent underline">lea@indrearne.com</a>.
          You also have the right to complain to Datatilsynet, the Norwegian Data Protection Authority.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          For as long as your account exists. When you delete your account, your data is removed from our
          database immediately. Backups are rotated within 30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>Inifini is not intended for children under 13, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes in a way that affects you, we will say so in the app before the change takes
          effect.
        </p>
      </Section>

      <p className="mt-10 text-[13px] text-muted">
        Questions? <a href="mailto:lea@indrearne.com" className="underline">lea@indrearne.com</a>
      </p>
    </main>
  );
}
