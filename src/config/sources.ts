import { Source } from '@/lib/types';

/**
 * RSS sources. Add/remove here. Only title, excerpt, link, date and
 * attribution are ingested — never full article text.
 */
export const RSS_SOURCES: Omit<Source, 'id'>[] = [
  { name: 'NRK', rss_url: 'https://www.nrk.no/toppsaker.rss', domain: 'nrk.no', language: 'no', region: 'no', category: 'norway', trust_level: 95, active: true },
  { name: 'NRK Urix', rss_url: 'https://www.nrk.no/urix/toppsaker.rss', domain: 'nrk.no', language: 'no', region: 'world', category: 'world', trust_level: 95, active: true },
  { name: 'BBC World', rss_url: 'https://feeds.bbci.co.uk/news/world/rss.xml', domain: 'bbc.com', language: 'en', region: 'world', category: 'world', trust_level: 92, active: true },
  { name: 'The Guardian World', rss_url: 'https://www.theguardian.com/world/rss', domain: 'theguardian.com', language: 'en', region: 'world', category: 'world', trust_level: 88, active: true },
  { name: 'E24', rss_url: 'https://e24.no/rss', domain: 'e24.no', language: 'no', region: 'no', category: 'business', trust_level: 85, active: true },
  { name: 'TechCrunch', rss_url: 'https://techcrunch.com/feed/', domain: 'techcrunch.com', language: 'en', region: 'world', category: 'technology', trust_level: 75, active: true },
  { name: 'Ars Technica', rss_url: 'https://feeds.arstechnica.com/arstechnica/index', domain: 'arstechnica.com', language: 'en', region: 'world', category: 'science', trust_level: 80, active: true },
];
