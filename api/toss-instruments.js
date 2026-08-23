const ETF_BRANDS = ['TIGER', 'RISE', 'KODEX', 'ACE', 'SOL', 'HANARO', 'KBSTAR', 'KOSEF', 'ARIRANG', 'TIMEFOLIO'];
const MAX_RESULTS = 20;

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

function getSearchTerms(query) {
  const normalizedQuery = normalize(query);
  const tickerTerms = (query.match(/[A-Za-z]{1,6}|\d{4,6}/g) || []).map(normalize);
  const nameQuery = normalize(query
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[A-Za-z]{1,6}\b|\b\d{4,6}\b/g, ' '));
  return [...new Set([normalizedQuery, nameQuery, ...tickerTerms].filter(Boolean))];
}

async function fetchCandidates(term) {
  const baseUrl = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const params = new URLSearchParams({
    select: 'symbol,name,market,security_type,isin_code',
    or: `(symbol.ilike.*${term}*,name.ilike.*${term}*)`,
    limit: '1000',
  });
  const response = await fetch(`${baseUrl}/rest/v1/instrument_search_index?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!response.ok) throw new Error(`Instrument index request failed: ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const query = String(req.query?.q || '').trim();
  const brand = String(req.query?.brand || '').trim().toUpperCase();
  if (query.length < 2) return res.status(200).json({ items: [] });
  if (brand && !ETF_BRANDS.includes(brand)) return res.status(400).json({ error: '지원하지 않는 ETF 브랜드입니다.' });
  if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Instrument search index is not configured' });
  }

  try {
    const terms = getSearchTerms(query);
    const rowsByKey = new Map();
    for (const term of terms) {
      const rows = await fetchCandidates(term);
      rows.forEach((row) => rowsByKey.set(`${row.market}:${row.symbol}`, row));
      if (rowsByKey.size >= 1000) break;
    }

    const items = [...rowsByKey.values()]
      .filter((item) => {
        const symbol = normalize(item.symbol);
        const name = normalize(item.name);
        const matchesBrand = !brand || name.startsWith(normalize(brand));
        const matchesQuery = terms.some((term) => symbol.includes(term) || name.includes(term));
        return matchesBrand && matchesQuery;
      })
      .slice(0, MAX_RESULTS)
      .map((item) => ({
        symbol: item.symbol,
        name: item.name,
        market: item.market || null,
        securityType: item.security_type || null,
        isinCode: item.isin_code || null,
      }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error('Cached instrument search failed:', error);
    return res.status(502).json({ error: 'Cached instrument search failed' });
  }
}
