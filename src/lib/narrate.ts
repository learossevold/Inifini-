/**
 * Watch-tab narration audio.
 *
 * Reads the short summary aloud with OpenAI TTS — never fabricated video
 * footage, just a real, calm voice over the story's own photo (see the
 * editorial note). Silently returns null with no key set, so the app keeps
 * working with silent caption cards, same as the AI summarizer's fallback.
 */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  const apiKey = process.env.OPENAI_API_KEY_TTS;
  if (!apiKey || !text.trim()) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'alloy', input: text, response_format: 'mp3' }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
