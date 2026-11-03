import { getOfficialSyncWarning } from './officialSyncStatus';

const normalizeTicker = (value) => String(value || '').trim().toUpperCase();
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function buildTodayScheduledNotifications({
  officialDistributions = [], eligibleTickers = [], now = new Date(), loading = false,
  officialDataError = null, error = null, officialSyncStatus = null, tickersMap = {},
}) {
  if (loading) return { notifications: [], count: 0, status: 'loading', message: '공식 배당 예정 내역을 불러오는 중입니다.' };
  if (error || officialDataError) return { notifications: [], count: 0, status: 'error', message: '오늘 공식 배당 예정 내역을 확인할 수 없습니다. 다시 시도해 주세요.' };
  const eligible = new Set(eligibleTickers.map(normalizeTicker));
  const today = localDate(now);
  const seen = new Set();
  const notifications = [];
  (officialDistributions || []).forEach((item) => {
    const ticker = normalizeTicker(item.ticker);
    const rawAmount = item.distribution_per_share;
    if (rawAmount === null || rawAmount === undefined || (typeof rawAmount === 'string' && rawAmount.trim() === '')) return;
    const amount = Number(rawAmount);
    if (!eligible.has(ticker) || item.payment_date !== today || !item.source_url || !item.source_issuer || !Number.isFinite(amount)) return;
    const key = [ticker, item.ex_date, item.payment_date, item.source_issuer].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    const metadata = tickersMap[ticker] || {};
    notifications.push({ ticker, ex_date: item.ex_date || null, payment_date: item.payment_date, amount, currency: item.currency || 'KRW', unit: '주당',
      company_name: metadata.company_name_kr || metadata.company_name || metadata.name || item.product_name || null,
      source_issuer: item.source_issuer, source_url: item.source_url });
  });
  const warning = getOfficialSyncWarning(officialSyncStatus, now);
  return { notifications, count: notifications.length, status: warning ? 'sync-warning' : 'ready', message: warning || '' };
}
