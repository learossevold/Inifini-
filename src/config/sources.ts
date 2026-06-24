import { Source } from '@/lib/types';

/**
 * RSS sources. Add/remove here. Only title, excerpt, link, date and
 * attribution are ingested — never full article text.
 * All sources must publish in English.
 */
export const RSS_SOURCES: Omit<Source, 'id'>[] = [
  { name: 'BBC News', rss_url: 'https://feeds.bbci.co.uk/news/rss.xml', domain: 'bbc.com', language: 'en', region: 'world', category: 'world', trust_level: 92, active: true },
  { name: 'BBC World', rss_url: 'https://feeds.bbci.co.uk/news/world/rss.xml', domain: 'bbc.com', language: 'en', region: 'world', category: 'world', trust_level: 92, active: true },
  { name: 'BBC Sport', rss_url: 'https://feeds.bbci.co.uk/sport/rss.xml', domain: 'bbc.com', language: 'en', region: 'world', category: 'sport', trust_level: 90, active: true },
  { name: 'Al Jazeera', rss_url: 'https://www.aljazeera.com/xml/rss/all.xml', domain: 'aljazeera.com', language: 'en', region: 'world', category: 'world', trust_level: 85, active: true },
  { name: 'Sky News', rss_url: 'https://feeds.skynews.com/feeds/rss/home.xml', domain: 'skynews.com', language: 'en', region: 'world', category: 'world', trust_level: 80, active: true },
  { name: 'Sky Sports', rss_url: 'https://www.skysports.com/rss/12040', domain: 'skysports.com', language: 'en', region: 'world', category: 'sport', trust_level: 78, active: true },
  { name: 'DW News', rss_url: 'https://rss.dw.com/xml/rss-en-all', domain: 'dw.com', language: 'en', region: 'world', category: 'world', trust_level: 88, active: true },
  { name: 'The Guardian', rss_url: 'https://www.theguardian.com/world/rss', domain: 'theguardian.com', language: 'en', region: 'world', category: 'world', trust_level: 88, active: true },
  { name: 'TechCrunch', rss_url: 'https://techcrunch.com/feed/', domain: 'techcrunch.com', language: 'en', region: 'world', category: 'technology', trust_level: 75, active: true },
  { name: 'Ars Technica', rss_url: 'https://feeds.arstechnica.com/arstechnica/index', domain: 'arstechnica.com', language: 'en', region: 'world', category: 'science', trust_level: 80, active: true },
];
