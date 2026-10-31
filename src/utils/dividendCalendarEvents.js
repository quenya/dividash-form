import { isVerifiedMatch } from './tickerMatching';

const normalizeTicker = (ticker) => String(ticker || '').trim().toUpperCase();

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthWindow(now) {
  const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    Math.min(now.getDate(), lastDayOfPreviousMonth),
  );
  return { start: toLocalDateString(start), end: toLocalDateString(now) };
}

function normalizeName(value) {
  return String(value || '').trim().toLocaleUpperCase().replace(/\s+/g, '');
}

function confirmedMatchByName(matches = []) {
  const aliases = new Map();
  matches.forEach((match) => {
    if (!isVerifiedMatch(match)) return;
    [match.source_input, match.matched_company_name].forEach((name) => {
      const key = normalizeName(name);
      if (!key) return;
      if (!aliases.has(key)) aliases.set(key, new Set());
      aliases.get(key).add(normalizeTicker(match.matched_ticker));
    });
  });
  return aliases;
}

function tickerForEntry(entry, aliases) {
  const ticker = normalizeTicker(entry.ticker);
  if (ticker) return ticker;
  const matches = aliases.get(normalizeName(entry.company_name));
  return matches?.size === 1 ? [...matches][0] : '';
}

export function getRecentEtfCandidateSymbols(entries = [], matches = [], now = new Date()) {
  const { start, end } = getMonthWindow(now);
  const aliases = confirmedMatchByName(matches);
  return [...new Set(entries
    .filter((entry) => entry.payment_date >= start && entry.payment_date <= end)
    .map((entry) => tickerForEntry(entry, aliases))
    .filter(Boolean))].sort();
}

function isEtf(instrument) {
  const type = String(instrument?.security_type || '').trim().toLocaleLowerCase();
  return type === 'etf' || type.includes('상장지수펀드') || type.includes('상장지수');
}

export function resolveRecentEtfTickers({ entries = [], instruments = [], matches = [], now = new Date() }) {
  const { start, end } = getMonthWindow(now);
  const aliases = confirmedMatchByName(matches);
  const recentTickers = new Set(entries
    .filter((entry) => entry.payment_date >= start && entry.payment_date <= end)
    .map((entry) => tickerForEntry(entry, aliases))
    .filter(Boolean));
  const verifiedEtfs = new Set(instruments
    .filter(isEtf)
    .map((instrument) => normalizeTicker(instrument.symbol))
    .filter(Boolean));
  return [...recentTickers].filter((ticker) => verifiedEtfs.has(ticker)).sort();
}

export function buildDividendCalendarEvents({
  actualEntries = [],
  officialDistributions = [],
  eligibleTickers = [],
  now = new Date(),
}) {
  const eligible = new Set(eligibleTickers.map(normalizeTicker));
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const followingMonthStart = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const events = actualEntries
    .filter((entry) => entry.payment_date)
    .map((entry) => ({ ...entry, type: 'actual', amount: Number(entry.dividend_amount) || 0 }));
  const seenSchedules = new Set();

  officialDistributions.forEach((distribution) => {
    const ticker = normalizeTicker(distribution.ticker);
    const amount = Number(distribution.distribution_per_share);
    const paymentDate = new Date(`${distribution.payment_date}T00:00:00`);
    if (!eligible.has(ticker)
      || Number.isNaN(paymentDate.getTime())
      || paymentDate < currentMonthStart
      || paymentDate >= followingMonthStart
      || !Number.isFinite(amount)
      || !distribution.source_url
      || !distribution.source_issuer) return;

    const key = [ticker, distribution.ex_date, distribution.payment_date, distribution.source_issuer].join('|');
    if (seenSchedules.has(key)) return;
    seenSchedules.add(key);
    events.push({
      ...distribution,
      ticker,
      type: 'scheduled',
      amount,
      company_name: distribution.company_name || distribution.product_name || ticker,
    });
  });

  return events.sort((left, right) => (
    left.payment_date.localeCompare(right.payment_date)
    || (left.type === right.type ? 0 : left.type === 'scheduled' ? -1 : 1)
    || String(left.ticker || left.company_name || '').localeCompare(String(right.ticker || right.company_name || ''))
  ));
}
