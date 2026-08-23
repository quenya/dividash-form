const DEFAULT_BASE_URL = 'https://openapi.tossinvest.com';
const MARKETS = ['KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', 'AMEX'];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_QUERY_LENGTH = 2;

function getCache() {
  if (!globalThis.__tossInstrumentCache) globalThis.__tossInstrumentCache = new Map();
  return globalThis.__tossInstrumentCache;
}

async function getAccessToken() {
  const cached = globalThis.__tossAccessToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const baseUrl = process.env.TOSSINVEST_BASE_URL || DEFAULT_BASE_URL;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.TOSSINVEST_CLIENT_ID || '',
    client_secret: process.env.TOSSINVEST_CLIENT_SECRET || '',
  });
  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`TOSS token request failed: ${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('TOSS token response did not include access_token');

  globalThis.__tossAccessToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  return payload.access_token;
}

async function loadMarket(market) {
  const cache = getCache();
  const cached = cache.get(market);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const token = await getAccessToken();
  const baseUrl = process.env.TOSSINVEST_BASE_URL || DEFAULT_BASE_URL;
  const params = new URLSearchParams({ market, status: 'ACTIVE' });
  const response = await fetch(`${baseUrl}/api/v1/stocks/all?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`TOSS stock list request failed for ${market}: ${response.status}`);
  const payload = await response.json();
  const items = Array.isArray(payload.result) ? payload.result : [];
  cache.set(market, { expiresAt: Date.now() + CACHE_TTL_MS, items });
  return items;
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('ko-KR');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const query = String(req.query?.q || '').trim();
  if (query.length < MIN_QUERY_LENGTH) return res.status(200).json({ items: [] });
  if (!process.env.TOSSINVEST_CLIENT_ID || !process.env.TOSSINVEST_CLIENT_SECRET) {
    return res.status(503).json({ error: 'TOSS search is not configured' });
  }

  try {
    const normalizedQuery = normalize(query);
    const marketResults = await Promise.allSettled(MARKETS.map(loadMarket));
    const allItems = marketResults.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    const seen = new Set();
    const items = allItems
      .filter((item) => {
        const symbol = normalize(item.symbol);
        const name = normalize(item.name);
        return symbol.includes(normalizedQuery) || name.includes(normalizedQuery);
      })
      .filter((item) => {
        const key = `${item.symbol}:${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20)
      .map((item) => ({
        symbol: item.symbol,
        name: item.name,
        market: item.market || null,
        securityType: item.securityType || null,
        isinCode: item.isinCode || null,
      }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error('TOSS instrument search failed:', error);
    return res.status(502).json({ error: 'TOSS instrument search failed' });
  }
}
