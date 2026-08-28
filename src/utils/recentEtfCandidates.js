const KOREAN_TICKER_PATTERN = /^[A-Z0-9]{6}$/;

function normalizeTicker(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeLookup(value) {
  return normalizeTicker(value).replace(/\s+/g, '');
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function subtractOneMonth(date) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - 1);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

function subtractMonths(date, months) {
  let result = new Date(date);
  for (let index = 0; index < months; index += 1) result = subtractOneMonth(result);
  return result;
}

function isEtfInstrument(instrument) {
  const type = String(instrument?.security_type || instrument?.securityType || '').trim();
  return /(^|\s)ETF(\s|$)/i.test(type) || type.includes('상장지수');
}

export function getRecentEtfCandidates(entries, instruments = [], asOfDate = new Date(), matches = [], windowMonths = 1) {
  const datedEntries = (entries || [])
    .map((entry) => ({ ...entry, parsedPaymentDate: parseDate(entry.payment_date) }))
    .filter((entry) => entry.parsedPaymentDate && (normalizeTicker(entry.ticker) || normalizeLookup(entry.company_name)));

  const referenceDate = parseDate(asOfDate);
  if (!referenceDate || !datedEntries.length) {
    return { referenceDate: null, periodStart: null, items: [] };
  }

  const latestPaymentDate = new Date(Math.max(...datedEntries.map((entry) => entry.parsedPaymentDate.getTime())));
  const periodStartDate = subtractMonths(latestPaymentDate, windowMonths);
  const referenceDateText = formatDate(referenceDate);
  const periodStart = formatDate(periodStartDate);
  const instrumentMap = new Map(
    (instruments || []).map((instrument) => [normalizeTicker(instrument.symbol || instrument.ticker), instrument]),
  );
  const matchMap = new Map();
  (matches || []).forEach((match) => {
    if (match?.status !== 'confirmed' || match?.confidence !== 'high') return;
    const matchedTicker = normalizeTicker(match.matched_ticker);
    if (!matchedTicker) return;
    [match.source_input, match.matched_company_name].forEach((alias) => {
      const key = normalizeLookup(alias);
      if (key) matchMap.set(key, matchedTicker);
    });
  });
  const candidates = new Map();
  const seenEntries = new Set();

  datedEntries
    .filter((entry) => entry.parsedPaymentDate >= periodStartDate && entry.parsedPaymentDate <= referenceDate)
    .forEach((entry) => {
      const ticker = normalizeTicker(entry.ticker)
        || matchMap.get(normalizeLookup(entry.company_name));
      const instrument = instrumentMap.get(ticker);
      if (!KOREAN_TICKER_PATTERN.test(ticker) || !isEtfInstrument(instrument)) return;
      const entryKey = `${ticker}:${formatDate(entry.parsedPaymentDate)}`;
      if (seenEntries.has(entryKey)) return;
      seenEntries.add(entryKey);

      const current = candidates.get(ticker) || {
        ticker,
        companyNames: new Set(),
        paymentDates: new Set(),
        entryCount: 0,
        instrument,
      };
      if (entry.company_name) current.companyNames.add(String(entry.company_name).trim());
      current.paymentDates.add(formatDate(entry.parsedPaymentDate));
      current.entryCount += 1;
      candidates.set(ticker, current);
    });

  return {
    referenceDate: referenceDateText,
    periodStart,
    items: [...candidates.values()]
      .map(({ companyNames, paymentDates, ...item }) => ({
        ...item,
        companyNames: [...companyNames].sort(),
        paymentDates: [...paymentDates].sort(),
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker)),
  };
}

export { subtractOneMonth };
