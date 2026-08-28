function dateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function money(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function lookup(value) { return String(value || '').toUpperCase().replace(/\s+/g, ''); }

export function buildEtfCacheAnalytics({ entries = [], items = [], asOfDate = new Date(), matches = [], distributions = [], windowMonths = 1 }) {
  const anchor = dateOnly(asOfDate);
  const latest = entries.map((entry) => dateOnly(entry.payment_date)).filter(Boolean).sort((a, b) => b - a)[0];
  const end = anchor || latest;
  const start = latest ? new Date(latest) : null;
  if (start) start.setUTCMonth(start.getUTCMonth() - windowMonths);
  const aliases = new Map();
  matches.forEach((match) => {
    if (match.status === 'confirmed' && match.confidence === 'high') {
      [match.source_input, match.matched_company_name].forEach((name) => aliases.set(lookup(name), String(match.matched_ticker).trim().toUpperCase()));
    }
  });
  const itemByName = new Map(items.flatMap((item) => [
    ...(item.companyNames || []),
    item.cache?.product_name,
  ].filter(Boolean).map((name) => [lookup(name), item.ticker])));
  const distributionMap = new Map((distributions || []).map((row) => {
    const ticker = String(row.ticker || '').trim().toUpperCase();
    const date = row.payment_date || row.ex_date;
    return [`${ticker}:${date}`, row];
  }));
  const resolve = (entry) => itemByName.get(lookup(entry.company_name)) || aliases.get(lookup(entry.company_name)) || String(entry.ticker || '').trim().toUpperCase();
  const scoped = entries.map((entry) => ({ ...entry, rawTicker: entry.ticker || null, ticker: resolve(entry), date: dateOnly(entry.payment_date), amount: money(entry.dividend_amount), currency: entry.currency || '미지정' })).filter((entry) => entry.ticker && entry.date);
  const current = scoped.filter((entry) => start && end && entry.date >= start && entry.date <= end);
  const previousStart = start ? new Date(start) : null;
  const previousEnd = start ? new Date(start.getTime() - 86400000) : null;
  if (previousStart) previousStart.setUTCMonth(previousStart.getUTCMonth() - windowMonths);
  const previous = scoped.filter((entry) => previousStart && previousEnd && entry.date >= previousStart && entry.date <= previousEnd);
  // The historical trend is anchored to the latest ledger payment date, not the machine clock.
  const trendEnd = latest || end;
  const yearStart = trendEnd ? new Date(trendEnd) : null;
  if (yearStart) yearStart.setUTCFullYear(yearStart.getUTCFullYear() - 1);
  const yearRows = scoped.filter((entry) => yearStart && trendEnd && entry.date >= yearStart && entry.date <= trendEnd);
  const byTicker = (rows, ticker) => rows.filter((row) => row.ticker === ticker);
  const totals = (rows) => rows.filter((row) => row.amount !== null).reduce((out, row) => { out[row.currency] = (out[row.currency] || 0) + row.amount; return out; }, {});
  const validFees = items.filter((item) => Number.isFinite(Number(item.cache?.total_fee))).sort((a, b) => Number(a.cache.total_fee) - Number(b.cache.total_fee));
  const validAum = items.filter((item) => Number.isFinite(Number(item.cache?.net_assets)));
  const aumTotal = validAum.reduce((sum, item) => sum + Number(item.cache.net_assets), 0);
  return items.map((item) => {
    const rows = byTicker(current, item.ticker);
    const trendRows = byTicker(yearRows, item.ticker);
    const prior = byTicker(previous, item.ticker);
    const amounts = totals(rows);
    const priorAmounts = totals(prior);
    const currencies = Object.keys(amounts);
    const eventDates = [...new Set(rows.map((row) => row.date.toISOString().slice(0, 10)))].sort();
    const trendDates = [...new Set(trendRows.map((row) => row.date.toISOString().slice(0, 10)))].sort();
    const trendTotals = trendRows.reduce((out, row) => {
      if (row.amount !== null) out[row.date.toISOString().slice(0, 10)] = (out[row.date.toISOString().slice(0, 10)] || 0) + row.amount;
      return out;
    }, {});
    const dateTotals = rows.reduce((out, row) => {
      if (row.amount !== null && currencies.includes(row.currency)) out[row.date.toISOString().slice(0, 10)] = (out[row.date.toISOString().slice(0, 10)] || 0) + row.amount;
      return out;
    }, {});
    const values = currencies.length === 1 ? eventDates.map((date) => dateTotals[date] ?? null) : [];
    const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const variance = mean !== null ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length : null;
    const cv = mean ? Math.sqrt(variance) / Math.abs(mean) : null;
    const total = currencies.length === 1 ? amounts[currencies[0]] : null;
    const previousTotal = currencies.length === 1 ? priorAmounts[currencies[0]] || 0 : null;
    const growth = previousTotal ? ((total - previousTotal) / previousTotal) * 100 : null;
    const dates = eventDates.map(dateOnly);
    const trendCurrency = [...new Set(trendRows.filter((row) => row.amount !== null).map((row) => row.currency))];
    const trend = trendCurrency.length === 1 ? trendDates.map((date) => {
      const source = distributionMap.get(`${item.ticker}:${date}`);
      return { date, value: trendTotals[date] ?? null, distributionRate: Number.isFinite(Number(source?.distribution_rate)) ? Number(source.distribution_rate) : null };
    }) : [];
    const interval = dates.length > 1 ? dates.slice(1).reduce((sum, date, index) => sum + daysBetween(dates[index], date), 0) / (dates.length - 1) : null;
    const feeRank = validFees.findIndex((candidate) => candidate.ticker === item.ticker);
    const aumRank = [...validAum].sort((a, b) => Number(b.cache.net_assets) - Number(a.cache.net_assets)).findIndex((candidate) => candidate.ticker === item.ticker);
    const itemNames = new Set([...(item.companyNames || []), item.cache?.product_name].filter(Boolean).map(lookup));
    const sourceRows = scoped.filter((row) => row.ticker === item.ticker || itemNames.has(lookup(row.company_name))).map((row) => ({ rawTicker: row.rawTicker || null, companyName: row.company_name || null, date: row.date.toISOString().slice(0, 10), amount: row.amount, currency: row.currency, inTrend: trendRows.includes(row) }));
    return { ticker: item.ticker, total, currency: currencies.length === 1 ? currencies[0] : null, trend, sourceRows, growth, eventCount: eventDates.length, averagePayout: eventDates.length && total !== null ? total / eventDates.length : null, cv, interval, listedDays: item.cache?.listing_date && end ? daysBetween(dateOnly(item.cache.listing_date), end) : null, feeRank: feeRank >= 0 ? feeRank + 1 : null, aumRank: aumRank >= 0 ? aumRank + 1 : null, aumShare: aumTotal && item.cache?.net_assets ? (Number(item.cache.net_assets) / aumTotal) * 100 : null };
  });
}
