import { buildThreeDayScheduledNotifications } from './threeDayScheduledNotifications';

const schedule = (overrides = {}) => ({ ticker: '069500', payment_date: '2026-11-03', distribution_per_share: 125, currency: 'KRW', source_issuer: 'KODEX', source_url: 'https://issuer.example', ...overrides });
const now = new Date(2026, 10, 3, 12);

test('includes today through day after tomorrow across month and year boundaries', () => {
  const result = buildThreeDayScheduledNotifications({ now: new Date(2026, 11, 31, 12), eligibleTickers: ['069500'], officialDistributions: [
    schedule({ payment_date: '2026-12-31' }), schedule({ payment_date: '2027-01-01', ex_date: 'a' }), schedule({ payment_date: '2027-01-02', ex_date: 'b' }), schedule({ payment_date: '2027-01-03', ex_date: 'c' }),
  ] });
  expect(result.notifications.map((item) => item.payment_date)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
});

test('attaches only same ticker and exact-date actual receipts, preserving account amount and currency', () => {
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule()], actualEntries: [
    { ticker: '069500', payment_date: '2026-11-03', account_name: 'Account A', dividend_amount: '1200.50', currency: 'USD' },
    { ticker: '069500', payment_date: '2026-11-04', account_name: 'future', dividend_amount: 999, currency: 'KRW' },
    { ticker: '069500', payment_date: '2026-11-03', account_name: 'other', dividend_amount: 700, currency: 'KRW' },
  ] });
  expect(result.notifications[0].actualReceipts).toEqual([
    { account_name: 'Account A', dividend_amount: '1200.50', currency: 'USD' },
    { account_name: 'other', dividend_amount: 700, currency: 'KRW' },
  ]);
  expect(result.notifications[0].amount).toBe(125);
});

test('does not guess ambiguous names and uses confirmed high-confidence aliases only', () => {
  const entries = [{ company_name: 'Ambiguous', payment_date: '2026-11-03', dividend_amount: 50, currency: 'KRW' }, { company_name: 'Verified Name', payment_date: '2026-11-03', dividend_amount: 75, currency: 'KRW' }];
  const matches = [
    { source_input: 'Verified Name', matched_company_name: 'Verified Name', matched_ticker: '069500', status: 'confirmed', confidence: 'high', market: 'KR', sector: 'fund', industry: 'fund', evidence: 'official' },
    { source_input: 'Ambiguous', matched_company_name: 'Ambiguous', matched_ticker: '069500', status: 'manual_review', confidence: 'low' },
  ];
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule()], actualEntries: entries, tickerMatchesMap: Object.fromEntries(matches.map((m) => [m.source_input.toUpperCase(), m])) });
  expect(result.notifications[0].actualReceipts.map((r) => r.dividend_amount)).toEqual([75]);
});

test('returns an empty receipt list rather than claiming non-payment', () => {
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule()] });
  expect(result.notifications[0].actualReceipts).toEqual([]);
  expect(result.notifications[0].receiptStatus).toBe('unregistered');
});

test('preserves distinct ledger rows without allocating them across multiple same-date schedules', () => {
  const row = { ticker: '069500', payment_date: '2026-11-03', dividend_amount: 1200, currency: 'KRW' };
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule({ ex_date: 'a' }), schedule({ ex_date: 'b' })], actualEntries: [{ ...row, id: 'first' }, { ...row, id: 'second' }] });
  expect(result.notifications).toHaveLength(2);
  expect(result.notifications.map((n) => n.actualReceipts)).toEqual([[], []]);
});

test('marks receipts ambiguous when multiple same-ticker schedules share a payment date', () => {
  const row = { ticker: '069500', payment_date: '2026-11-03', dividend_amount: 1200, currency: 'KRW' };
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule({ ex_date: 'a' }), schedule({ ex_date: 'b' })], actualEntries: [row] });
  expect(result.notifications.map((n) => n.receiptStatus)).toEqual(['ambiguous', 'ambiguous']);
  expect(result.notifications.map((n) => n.actualReceipts)).toEqual([[], []]);
});

test('keeps schedule when official per-share amount is unknown', () => {
  const result = buildThreeDayScheduledNotifications({ now, eligibleTickers: ['069500'], officialDistributions: [schedule({ distribution_per_share: null })] });
  expect(result.notifications).toHaveLength(1);
  expect(result.notifications[0].amount).toBeNull();
});
