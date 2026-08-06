import { Greeting } from '@/lib/greeting';

/**
 * The editor meeting the reader at the top of the tab — not a chatbot
 * bubble, so it's plain text laid out like a masthead line, not a card.
 */
export default function EditorGreeting({ greeting }: { greeting: Greeting }) {
  return (
    <div className="pt-6">
      <p className="font-serif text-xl font-semibold text-ink">{greeting.salutation}</p>
      <p className="mt-1 font-sans text-sm text-muted">{greeting.message}</p>
    </div>
  );
}
