const ISSUER_ADAPTERS = {
  KODEX: 'kodex',
  SOL: 'sol',
  RISE: 'rise',
};

export function getIssuerAdapter(issuer) {
  return ISSUER_ADAPTERS[String(issuer || '').trim().toUpperCase()] || null;
}

export function normalizeDistributionRecord(record, fallback = {}) {
  return {
    ticker: String(record.ticker || fallback.ticker || '').trim().toUpperCase(),
    ex_date: record.ex_date || null,
    payment_date: record.payment_date || null,
    distribution_per_share: Number.isFinite(Number(record.distribution_per_share)) ? Number(record.distribution_per_share) : null,
    reference_price: Number.isFinite(Number(record.reference_price)) ? Number(record.reference_price) : null,
    distribution_rate: Number.isFinite(Number(record.distribution_rate)) ? Number(record.distribution_rate) : null,
    currency: record.currency || 'KRW',
    source_issuer: String(record.source_issuer || fallback.issuer || 'OTHER').toUpperCase(),
    source_url: record.source_url || fallback.official_url || '',
    source_updated_at: record.source_updated_at || null,
    fetched_at: record.fetched_at || new Date().toISOString(),
    parser_version: record.parser_version || '1',
    raw_payload: record.raw_payload || {},
  };
}

export function calculateDistributionRate(distributionPerShare, referencePrice) {
  const distribution = Number(distributionPerShare);
  const price = Number(referencePrice);
  if (!Number.isFinite(distribution) || !Number.isFinite(price) || price <= 0) return null;
  return (distribution / price) * 100;
}

export { ISSUER_ADAPTERS };
