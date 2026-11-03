import { getOfficialSyncWarning } from './officialSyncStatus';
import { resolveInstrument } from './tickerMatching';

const normalizeTicker = (value) => String(value || '').trim().toUpperCase();
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function buildThreeDayScheduledNotifications({
  officialDistributions = [], eligibleTickers = [], actualEntries = [], tickerMatchesMap = {}, tickersMap = {}, now = new Date(), loading = false,
  officialDataError = null, error = null, officialSyncStatus = null,
}) {
  if (loading) return { notifications: [], count: 0, status: 'loading', message: '공식 배당 예정 내역을 불러오는 중입니다.' };
  if (error || officialDataError) return { notifications: [], count: 0, status: 'error', message: '공식 배당 예정 내역을 확인할 수 없습니다. 다시 시도해 주세요.' };
  const eligible = new Set(eligibleTickers.map(normalizeTicker));
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates = [0, 1, 2].map((offset) => { const date = new Date(first); date.setDate(date.getDate() + offset); return localDate(date); });
  const seen = new Set();
  const notifications = [];
  (officialDistributions || []).forEach((item) => {
    const ticker = normalizeTicker(item.ticker);
    const rawAmount = item.distribution_per_share;
    const amountMissing = rawAmount === null || rawAmount === undefined || (typeof rawAmount === 'string' && rawAmount.trim() === '');
    const amount = amountMissing ? null : Number(rawAmount);
    if (!eligible.has(ticker) || !dates.includes(item.payment_date) || !item.source_url || !item.source_issuer || (!amountMissing && !Number.isFinite(amount))) return;
    const key = [ticker, item.ex_date, item.payment_date, item.source_issuer].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    const metadata = tickersMap[ticker] || {};
    notifications.push({ ticker, ex_date: item.ex_date || null, payment_date: item.payment_date, amount, currency: item.currency || 'KRW', unit: '주당',
      company_name: metadata.company_name_kr || metadata.company_name || metadata.name || item.product_name || null,
      source_issuer: item.source_issuer, source_url: item.source_url, actualReceipts: [], receiptStatus: 'unregistered' });
  });
  const scheduleCounts = new Map();
  notifications.forEach((note) => { const key = `${note.ticker}|${note.payment_date}`; scheduleCounts.set(key, (scheduleCounts.get(key) || 0) + 1); });
  notifications.forEach((note) => {
    if (scheduleCounts.get(`${note.ticker}|${note.payment_date}`) !== 1) {
      const hasMatchingReceipt = actualEntries.some((entry) => {
        if (entry.payment_date !== note.payment_date) return false;
        const directTicker = normalizeTicker(entry.ticker);
        if (directTicker) return directTicker === note.ticker;
        const resolution = resolveInstrument(entry, tickerMatchesMap, tickersMap);
        return resolution.resolvedTicker === note.ticker && resolution.isConfirmed;
      });
      if (hasMatchingReceipt) note.receiptStatus = 'ambiguous';
      return;
    }
    const matched = actualEntries.filter((entry) => {
      if (entry.payment_date !== note.payment_date) return false;
      const directTicker = normalizeTicker(entry.ticker);
      if (directTicker) return directTicker === note.ticker;
      const resolution = resolveInstrument(entry, tickerMatchesMap, tickersMap);
      return resolution.resolvedTicker === note.ticker && resolution.isConfirmed;
    });
    note.actualReceipts = matched.map((entry) => ({ account_name: entry.account_name || '', dividend_amount: entry.dividend_amount, currency: entry.currency || '' }));
    if (note.actualReceipts.length) note.receiptStatus = 'registered';
  });
  const warning = getOfficialSyncWarning(officialSyncStatus, now);
  return { notifications, count: notifications.length, status: warning ? 'sync-warning' : 'ready', message: warning || '' };
}
