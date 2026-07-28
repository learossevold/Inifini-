import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — Inifini',
  description: 'The rules for using Inifini, and what we promise in return.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-[20px] font-bold leading-snug">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="px-5 pb-16 pt-6">
      <Link href="/profile" className="font-sans text-[13px] font-semibold text-accent">← Back to profile</Link>

      <h1 className="mt-5 font-serif text-[30px] font-bold leading-tight">Terms of Use</h1>
      <p className="mt-2 text-[13px] text-muted">Last updated: 28 July 2026</p>

      <p className="mt-5 text-[15px] leading-relaxed text-ink/85">
        By using Inifini you agree to these terms. They are written to be read, not to be impressive.
      </p>

      <Section title="What Inifini is">
        <p>
          Inifini summarises news published by others. Every story credits its publisher and links to the
          original, which is always the source of record. Summaries are written with AI assistance from
          publishers&rsquo; public headlines and excerpts — they can contain errors, and they are not a
          substitute for the original reporting.
        </p>
        <p>
          The Watch tab narrates those summaries over the story&rsquo;s own photograph. It is always labelled
          as narration. We do not generate fabricated footage of news events.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You must be at least 13 to create an account. Keep access to your email secure — anyone who can
          read it can sign in as you. You are responsible for what you post from your account.
        </p>
      </Section>

      <Section title="How to behave">
        <p>Comments and messages are for real conversation. Do not post:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Harassment, threats, or abuse directed at anyone.</li>
          <li>Hate speech targeting people for who they are.</li>
          <li>Spam, scams, or repetitive promotional content.</li>
          <li>Anything illegal, or content that infringes someone else&rsquo;s rights.</li>
          <li>Deliberate misinformation presented as fact.</li>
        </ul>
        <p>
          You can block anyone, which stops their messages and hides your comments from each other. You can
          report a comment or story you think breaks these rules, and we will look at it.
        </p>
      </Section>

      <Section title="What we can do about it">
        <p>
          We may hide content or suspend accounts that break these rules. If we suspend your account we will
          tell you why, unless doing so would be unsafe or unlawful.
        </p>
      </Section>

      <Section title="Content you post">
        <p>
          What you write stays yours. By posting it you give us permission to display it within Inifini to
          the people it is meant for. Delete your account and your comments and messages go with it.
        </p>
      </Section>

      <Section title="Publishers">
        <p>
          Headlines, excerpts and images belong to the publishers who produced them and are used to point
          readers back to their reporting. If you are a publisher and want your feed removed from Inifini,
          email us and we will do it.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          Inifini is provided as it is. We work to keep it accurate and available, but we cannot promise it
          will always be either. Decisions you make based on a summary are your own — check the original.
        </p>
      </Section>

      <Section title="Ending it">
        <p>
          You can delete your account at any time from your profile. We may end these terms with you if you
          seriously or repeatedly break the rules above.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by Norwegian law.</p>
      </Section>

      <p className="mt-10 text-[13px] text-muted">
        Questions? <a href="mailto:lea@indrearne.com" className="underline">lea@indrearne.com</a>
      </p>
    </main>
  );
}
