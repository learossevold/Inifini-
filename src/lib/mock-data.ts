import { Story, Category, Profile, Comment, SharedStory } from './types';

const now = Date.now();
const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString();

interface Seed {
  title: string; category: Category; region: string; source: string; domain: string;
  hoursAgo: number; importance: number; image?: string; excerpt: string;
  short: string; medium: string; why: string; points: string[]; background: string; next: string;
}

const SEEDS: Seed[] = [
  {
    title: 'Western Norway braces for autumn storm; ferries and flights may be affected',
    category: 'local', region: 'local-bergen', source: 'NRK Vestland', domain: 'nrk.no', hoursAgo: 0.5, importance: 86,
    image: 'https://images.pexels.com/photos/1118869/pexels-photo-1118869.jpeg?auto=compress&w=1200',
    excerpt: 'A strong low-pressure system is expected to hit the west coast, with warnings issued for wind and rain.',
    short: 'A strong storm system is expected to hit Western Norway, with warnings for wind and heavy rain; ferry and flight disruptions are possible through the period.',
    medium: 'Meteorologists have issued warnings for strong wind and heavy rain as a low-pressure system approaches Western Norway. Ferry companies and airports are preparing for possible disruptions. Residents are advised to secure loose objects and follow updated forecasts, according to the source feed. The warning level may be adjusted as the system develops.',
    why: 'Storm disruptions affect commutes, ferries, flights and deliveries across the region — practical impact within hours, not days.',
    points: ['Warnings issued for wind and heavy rain', 'Ferries and flights may be disrupted', 'Residents advised to secure loose objects', 'Warning level may be adjusted'],
    background: 'Autumn low-pressure systems regularly disrupt transport along the west coast.',
    next: 'Updated forecasts will firm up timing and strength; check transport operators before travelling.',
  },
  {
    title: 'Storting reaches broad agreement on new energy package for households',
    category: 'norway', region: 'no', source: 'NRK', domain: 'nrk.no', hoursAgo: 1, importance: 92,
    image: 'https://images.pexels.com/photos/356036/pexels-photo-356036.jpeg?auto=compress&w=1200',
    excerpt: 'A majority in the Storting has agreed on a new support package for household electricity costs ahead of winter.',
    short: 'A parliamentary majority has agreed on a new household energy support package, expected to apply from this winter, after weeks of negotiation between the governing parties and the opposition.',
    medium: 'After several weeks of negotiation, a broad majority in the Storting has agreed on a new energy support package for households. The agreement adjusts the threshold for state support and extends the scheme through the coming winter. The package is expected to be formally approved in the coming weeks. Details on financing and exact thresholds are still being finalized, according to the source feed.',
    why: 'Electricity costs hit nearly every household budget in Norway. Changes to the support scheme directly affect what families pay each month through the winter.',
    points: ['Broad majority agreement in the Storting', 'Support threshold adjusted ahead of winter', 'Scheme extended through the season', 'Final details still being negotiated'],
    background: 'Norway has run household electricity support schemes since the 2021–22 price surge.',
    next: 'Formal approval is expected in the coming weeks. Final thresholds should clarify the real impact per household.',
  },
  {
    title: 'EU and US announce framework for joint AI safety testing',
    category: 'ai', region: 'world', source: 'BBC World', domain: 'bbc.com', hoursAgo: 3, importance: 88,
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&w=1200',
    excerpt: 'Regulators on both sides of the Atlantic outline a shared framework for evaluating advanced AI models before release.',
    short: 'EU and US regulators have outlined a shared framework for safety-testing advanced AI models before public release, a step toward coordinated oversight of frontier systems.',
    medium: 'Regulators in the EU and the US have announced a framework for jointly evaluating advanced AI models before they are released. The framework focuses on shared testing standards and information exchange between safety institutes. It is described as voluntary in its first phase. Industry response has been mixed, and implementation details remain limited in the source material.',
    why: 'Coordinated testing standards could shape which AI products reach the market and how quickly — affecting tools businesses and creators rely on daily.',
    points: ['Shared testing standards for frontier models', 'Information exchange between safety institutes', 'Voluntary in the first phase', 'Implementation details still limited'],
    background: 'Both the EU AI Act and US executive actions created national AI safety bodies; cross-border coordination has lagged.',
    next: 'Watch which AI companies sign on voluntarily, and whether the framework becomes binding later.',
  },
  {
    title: 'Oslo Børs hits record as energy and seafood lead gains',
    category: 'business', region: 'no', source: 'E24', domain: 'e24.no', hoursAgo: 4, importance: 70,
    image: 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&w=1200',
    excerpt: 'The main index closed at an all-time high, driven by energy and seafood stocks.',
    short: 'Oslo Børs closed at a record high, led by energy and seafood stocks, as international markets also trended upward through the week.',
    medium: 'The Oslo Stock Exchange main index closed at an all-time high, with energy and seafood companies leading the gains. The rise follows a broadly positive week in international markets. Analysts quoted in the source feed point to commodity prices and currency effects as key drivers, while warning the picture can shift quickly with global rates.',
    why: 'Record markets affect pension savings, the krone, and the broader mood of the Norwegian economy — even for people who own no stocks directly.',
    points: ['Main index at all-time high', 'Energy and seafood led the gains', 'Commodity prices and currency cited as drivers', 'Analysts caution about rate sensitivity'],
    background: 'Energy and seafood are structural heavyweights on Oslo Børs, making the index sensitive to commodity cycles.',
    next: 'Upcoming rate decisions and commodity prices will determine whether the record holds.',
  },
  {
    title: 'World leaders gather for climate adaptation summit as financing gap widens',
    category: 'world', region: 'world', source: 'BBC World', domain: 'bbc.com', hoursAgo: 5, importance: 85,
    image: 'https://images.pexels.com/photos/2990650/pexels-photo-2990650.jpeg?auto=compress&w=1200',
    excerpt: 'Delegations meet to negotiate adaptation financing amid reports the funding gap has grown.',
    short: 'World leaders are meeting to negotiate climate adaptation financing as new reports indicate the gap between pledged and needed funding has widened further.',
    medium: 'Delegations from more than a hundred countries are meeting to negotiate climate adaptation financing. The summit opens against reports that the gap between pledged funds and estimated needs has widened. Developing nations are pressing for binding commitments, while several major economies favour private-sector mechanisms, according to the source feed.',
    why: 'Adaptation financing determines how prepared vulnerable regions are for floods, drought and heat — and shapes migration and food prices globally.',
    points: ['100+ delegations negotiating adaptation funds', 'Funding gap reported to have widened', 'Developing nations push for binding commitments', 'Major economies favour private mechanisms'],
    background: 'Adaptation funding has consistently trailed mitigation funding in international climate finance.',
    next: 'A closing declaration is expected; whether it includes binding numbers is the key open question.',
  },
  {
    title: 'Bybanen extension to Åsane clears final planning hurdle',
    category: 'local', region: 'local-bergen', source: 'NRK Vestland', domain: 'nrk.no', hoursAgo: 6, importance: 72,
    image: 'https://images.pexels.com/photos/1796715/pexels-photo-1796715.jpeg?auto=compress&w=1200',
    excerpt: 'The light rail extension northwards from Bergen city centre has passed its final regulatory review.',
    short: 'Bergen\u2019s light rail extension to Åsane has passed its final regulatory review, moving the long-debated project closer to construction start.',
    medium: 'The planned Bybanen extension from Bergen city centre to Åsane has cleared its final planning hurdle after years of political debate over the route. With the regulatory review complete, the project can move toward financing decisions and a construction timeline. The route through the city centre remained the most contested element, according to the source feed.',
    why: 'The extension would reshape commuting for tens of thousands of residents north of the city centre.',
    points: ['Final regulatory review completed', 'Route debate centred on the city centre stretch', 'Financing decisions are next', 'Construction timeline not yet announced'],
    background: 'Bybanen has expanded in stages since 2010; the Åsane line is the most debated extension to date.',
    next: 'Financing and a construction schedule are the next milestones.',
  },
  {
    title: 'AI agents move from chat to checkout: retailers pilot autonomous shopping',
    category: 'ai', region: 'world', source: 'TechCrunch', domain: 'techcrunch.com', hoursAgo: 9, importance: 62,
    image: 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&w=1200',
    excerpt: 'Large retailers are piloting AI agents that compare, select and purchase products with user approval.',
    short: 'Large retailers are piloting AI agents that compare and purchase products with user approval — a shift that could reshape affiliate marketing and product discovery.',
    medium: 'Several large retailers are piloting AI shopping agents that compare products, apply user preferences and complete purchases after approval. The pilots are limited and opt-in. Analysts quoted in the source feed note the shift could reshape product discovery, advertising and affiliate economics if agents — not feeds — become the first touchpoint for buying.',
    why: 'If AI agents become the first stop for shopping, the economics of product discovery — including affiliate content — change fundamentally.',
    points: ['Retailers piloting autonomous shopping agents', 'Purchases require user approval', 'Pilots are limited and opt-in', 'Affiliate and ad economics could shift'],
    background: 'Agentic AI moved rapidly in 2025–26 from chat assistants toward task completion.',
    next: 'Watch conversion data from the pilots and how affiliate networks adapt attribution.',
  },
  {
    title: 'Global study links daily walking pace to long-term heart health',
    category: 'health', region: 'world', source: 'The Guardian', domain: 'theguardian.com', hoursAgo: 8, importance: 55,
    image: 'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&w=1200',
    excerpt: 'A large international study finds walking pace may matter as much as step count for cardiovascular outcomes.',
    short: 'A large international study suggests walking pace may matter as much as total step count for long-term heart health, based on data from hundreds of thousands of participants.',
    medium: 'An international research team analyzing activity data from hundreds of thousands of participants reports that walking pace shows a strong association with long-term cardiovascular outcomes — potentially as strong as step count. The study is observational, so it cannot prove cause and effect. Researchers quoted in the source feed suggest brisk intervals may be a practical target.',
    why: 'Most health advice focuses on step count. If pace matters as much, small changes could be an easier win than walking more.',
    points: ['Pace strongly associated with heart outcomes', 'Effect comparable to step count', 'Observational study — not proof of causation', 'Brisk intervals suggested as a target'],
    background: 'Step-count targets dominate consumer health tracking; pace has received less attention.',
    next: 'Expect follow-up studies and possibly updated activity guidance.',
  },
  {
    title: 'Champions League: Norwegian club secures historic group-stage point away',
    category: 'sport', region: 'no', source: 'NRK Sport', domain: 'nrk.no', hoursAgo: 11, importance: 48,
    image: 'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&w=1200',
    excerpt: 'A late equalizer earns a first-ever away point in the group stage.',
    short: 'A late equalizer earned a Norwegian club its first-ever away point in the Champions League group stage, keeping advancement hopes mathematically alive.',
    medium: 'A stoppage-time equalizer gave a Norwegian side its first away point in the Champions League group stage. The result keeps advancement mathematically possible going into the final rounds. The match report in the source feed highlights a strong defensive second half and a set-piece goal.',
    why: 'European results lift Norwegian football\u2019s coefficient, future seeding and revenue.',
    points: ['First-ever away point in the group stage', 'Stoppage-time equalizer from a set piece', 'Advancement still mathematically possible', 'Defensive second half praised'],
    background: 'Norwegian clubs have historically struggled to convert domestic dominance into European results.',
    next: 'The final group rounds decide advancement.',
  },
  {
    title: 'Streaming services test shared “slow TV” channels inspired by Nordic formats',
    category: 'culture', region: 'world', source: 'The Guardian', domain: 'theguardian.com', hoursAgo: 10, importance: 45,
    image: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&w=1200',
    excerpt: 'International platforms experiment with ambient, long-form programming pioneered by Norwegian broadcasters.',
    short: 'International streaming platforms are testing ambient, long-form “slow TV” channels inspired by Norwegian formats, betting calm content can compete with fast-scrolling feeds.',
    medium: 'Several international streaming services are experimenting with continuous, ambient programming — long train journeys, coastal voyages, fireplaces — a format pioneered by Norwegian public broadcasting. Executives quoted in the source feed frame it as counter-programming to short-form video fatigue. Early engagement numbers are described as promising but limited.',
    why: 'The experiment signals platforms see audience fatigue with fast feeds — the behavioural shift this kind of calm product is betting on.',
    points: ['Ambient long-form channels in testing', 'Format pioneered by Norwegian broadcasters', 'Framed as counter-programming to short video', 'Early engagement data limited'],
    background: 'NRK\u2019s minute-by-minute broadcasts made slow TV a recognized format.',
    next: 'Wider rollouts depend on retention data.',
  },
  {
    title: 'Politics: government presents revised budget with tax shift for small businesses',
    category: 'politics', region: 'no', source: 'NRK', domain: 'nrk.no', hoursAgo: 7, importance: 75,
    image: 'https://images.pexels.com/photos/1056553/pexels-photo-1056553.jpeg?auto=compress&w=1200',
    excerpt: 'The revised national budget proposes adjusted taxation for small enterprises and sole proprietors.',
    short: 'The government\u2019s revised budget proposes a tax shift for small businesses and sole proprietors, framed as supporting entrepreneurship; opposition parties question the financing.',
    medium: 'The government has presented a revised national budget that includes adjusted taxation for small enterprises and sole proprietors, presented as a measure to support entrepreneurship and side income. Opposition parties question how the changes are financed. The proposal now goes to committee, per the source feed.',
    why: 'If you run a side business or sole proprietorship, the tax treatment directly changes what you keep.',
    points: ['Tax adjustment for small businesses proposed', 'Framed as supporting entrepreneurship', 'Opposition questions the financing', 'Proposal goes to committee next'],
    background: 'Small-business taxation has been a recurring negotiation point in recent budget cycles.',
    next: 'Committee treatment will determine the final shape before a vote.',
  },
  {
    title: 'Researchers map deep-sea life along the Norwegian continental shelf',
    category: 'science', region: 'no', source: 'NRK', domain: 'nrk.no', hoursAgo: 13, importance: 60,
    image: 'https://images.pexels.com/photos/3894157/pexels-photo-3894157.jpeg?auto=compress&w=1200',
    excerpt: 'A new mapping expedition documents previously unrecorded species in deep waters off the Norwegian coast.',
    short: 'A mapping expedition has documented previously unrecorded species in deep waters off Norway, ahead of decisions about seabed mineral activity on the continental shelf.',
    medium: 'Researchers have completed a mapping expedition along the Norwegian continental shelf, documenting species not previously recorded in the area. The findings arrive as Norway weighs seabed mineral exploration, making baseline knowledge of deep-sea ecosystems politically relevant. The expedition\u2019s full dataset will be published later, according to the source feed.',
    why: 'What lives on the seabed directly shapes the debate over seabed mining — a contested environmental question in Norway.',
    points: ['Previously unrecorded species documented', 'Mapping covered deep waters off the coast', 'Findings feed into the seabed minerals debate', 'Full dataset to be published later'],
    background: 'Norway opened parts of its shelf for seabed mineral exploration steps in 2024, drawing criticism.',
    next: 'The full dataset and its use in licensing decisions will show whether it changes the debate.',
  },
];

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

export const MOCK_STORIES: Story[] = SEEDS.map((s, i) => ({
  id: `demo-${i + 1}`,
  title: s.title,
  slug: slugify(s.title),
  original_url: `https://${s.domain}/demo/${slugify(s.title)}`,
  source_name: s.source,
  source_domain: s.domain,
  category: s.category,
  region: s.region,
  language: s.domain.endsWith('.no') ? 'no' : 'en',
  published_at: h(s.hoursAgo),
  fetched_at: h(s.hoursAgo),
  image_url: s.image ?? null,
  original_excerpt: s.excerpt,
  ai_short_summary: s.short,
  ai_medium_summary: s.medium,
  ai_why_it_matters: s.why,
  ai_key_points: s.points,
  ai_background: s.background,
  ai_what_next: s.next,
  importance_score: s.importance,
  novelty_score: Math.max(20, 90 - s.hoursAgo * 2),
  relevance_score: s.region.startsWith('local') ? 85 : s.region === 'no' ? 75 : 60,
  status: 'published',
  is_demo: true,
  video_url: null,
  video_status: 'none',
  video_duration_seconds: Math.round(8 + s.short.length / 12),
  like_count: Math.round(40 + s.importance * 8 + i * 17),
  comment_count: Math.round(2 + (s.importance % 9) + (i % 5)),
  created_at: h(s.hoursAgo),
  updated_at: h(s.hoursAgo),
}));

// ---- Mock social data (demo mode, no auth) ----
export const MOCK_ME: Profile = {
  id: 'me', username: 'lea', display_name: 'Lea', avatar_url: null,
  bio: 'Building calm news. ☕️', created_at: h(800),
};

export const MOCK_USERS: Profile[] = [
  MOCK_ME,
  { id: 'u2', username: 'mariak', display_name: 'Maria K.', avatar_url: null, bio: null, created_at: h(900) },
  { id: 'u3', username: 'jonas', display_name: 'Jonas', avatar_url: null, bio: null, created_at: h(700) },
  { id: 'u4', username: 'sofie', display_name: 'Sofie', avatar_url: null, bio: null, created_at: h(600) },
];

export const MOCK_FRIENDS: Profile[] = MOCK_USERS.filter((u) => u.id !== 'me');

export const MOCK_FRIEND_REQUESTS: Profile[] = [
  { id: 'u5', username: 'henrik', display_name: 'Henrik', avatar_url: null, bio: null, created_at: h(40) },
];

export const MOCK_COMMENTS: Record<string, Comment[]> = {
  'demo-1': [
    { id: 'c1', story_id: 'demo-1', user_id: 'u2', parent_comment_id: null, content: 'Ferries already cancelled here in Sotra. Stay safe everyone!', created_at: h(0.3), hidden: false, author: { username: 'mariak', display_name: 'Maria K.', avatar_url: null }, like_count: 12, liked_by_me: false,
      replies: [
        { id: 'c1r1', story_id: 'demo-1', user_id: 'u3', parent_comment_id: 'c1', content: 'Same in Askøy. Wild wind right now.', created_at: h(0.2), hidden: false, author: { username: 'jonas', display_name: 'Jonas', avatar_url: null }, like_count: 4, liked_by_me: false },
      ] },
    { id: 'c2', story_id: 'demo-1', user_id: 'u4', parent_comment_id: null, content: 'Good reminder to charge phones and power banks.', created_at: h(0.1), hidden: false, author: { username: 'sofie', display_name: 'Sofie', avatar_url: null }, like_count: 7, liked_by_me: true, replies: [] },
  ],
  'demo-3': [
    { id: 'c3', story_id: 'demo-3', user_id: 'u3', parent_comment_id: null, content: 'Voluntary frameworks rarely have teeth. Curious who signs on.', created_at: h(2), hidden: false, author: { username: 'jonas', display_name: 'Jonas', avatar_url: null }, like_count: 9, liked_by_me: false, replies: [] },
  ],
};

export const MOCK_INBOX: SharedStory[] = [
  { id: 's1', story_id: 'demo-7', from_user_id: 'u2', to_user_id: 'me', created_at: h(1.5), read: false, story: MOCK_STORIES.find((s) => s.id === 'demo-7'), from: { username: 'mariak', display_name: 'Maria K.', avatar_url: null } },
  { id: 's2', story_id: 'demo-2', from_user_id: 'u3', to_user_id: 'me', created_at: h(5), read: true, story: MOCK_STORIES.find((s) => s.id === 'demo-2'), from: { username: 'jonas', display_name: 'Jonas', avatar_url: null } },
];

/** Cycle the pool so the feed never ends in mock mode. */
export function mockPage(page: number, pool: Story[] = MOCK_STORIES): Story[] {
  const out: Story[] = [];
  const size = 9;
  for (let i = 0; i < size; i++) {
    const idx = (page * size + i) % pool.length;
    const cycle = Math.floor((page * size + i) / pool.length);
    const base = pool[idx];
    out.push(cycle === 0 ? base : { ...base, id: `${base.id}-c${cycle}-${i}`, published_at: new Date(new Date(base.published_at).getTime() - cycle * 86400_000).toISOString() });
  }
  return out;
}
