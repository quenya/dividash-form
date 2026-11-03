import { buildTodayScheduledNotifications } from './todayScheduledNotifications';

const schedule = (overrides = {}) => ({
  ticker: '069500', payment_date: '2026-11-03', distribution_per_share: 125,
  currency: 'KRW', source_issuer: 'KODEX', source_url: 'https://issuer.example/069500',
  ...overrides,
});

const base = { now: new Date('2026-11-02T15:30:00Z'), eligibleTickers: ['069500'] };

test('includes only schedules on the local calendar date, including KST midnight boundary', () => {
  const result = buildTodayScheduledNotifications({ ...base, officialDistributions: [
    schedule(), schedule({ payment_date: '2026-11-02', ticker: 'PREV' }),
    schedule({ payment_date: '2026-11-04', ticker: 'NEXT' }),
  ] });
  expect(result.notifications).toHaveLength(1);
  expect(result.notifications[0].payment_date).toBe('2026-11-03');
});

test('excludes actual receipts, unverified tickers, and schedules without issuer evidence', () => {
  const result = buildTodayScheduledNotifications({ ...base,
    actualEntries: [{ payment_date: '2026-11-03', dividend_amount: 9000 }],
    eligibleTickers: ['069500'], officialDistributions: [
      schedule({ ticker: 'UNKNOWN' }), schedule({ source_url: '' }), schedule({ source_issuer: '' }),
    ],
  });
  expect(result.notifications).toEqual([]);
});

test('rejects null and empty distribution amounts instead of displaying zero', () => {
  const result = buildTodayScheduledNotifications({ ...base, officialDistributions: [
    schedule({ distribution_per_share: null }),
    schedule({ distribution_per_share: '' }),
    schedule({ distribution_per_share: '   ' }),
  ] });
  expect(result.notifications).toEqual([]);
  expect(result.count).toBe(0);
});

test('deduplicates official schedules and retains amount as per-share value', () => {
  const row = schedule();
  const result = buildTodayScheduledNotifications({ ...base, officialDistributions: [row, { ...row }] });
  expect(result.notifications).toHaveLength(1);
  expect(result.notifications[0]).toMatchObject({ amount: 125, currency: 'KRW', unit: '주당' });
  expect(result.count).toBe(1);
});

test('warns when sync status is null', () => {
  expect(buildTodayScheduledNotifications({ ...base, officialSyncStatus: null }).message)
    .toMatch(/동기화 상태를 확인할 수 없습니다/);
});

test('prefers tickers metadata company_name_kr', () => {
  const result = buildTodayScheduledNotifications({ ...base, tickersMap: { '069500': { company_name_kr: '코덱스이백', company_name: 'wrong' } }, officialDistributions: [schedule()] });
  expect(result.notifications[0].company_name).toBe('코덱스이백');
});

test('keeps separate ex-date events for the same ticker, payment date and issuer', () => {
  const first = schedule({ ex_date: '2026-10-01' });
  const second = schedule({ ex_date: '2026-10-15' });
  expect(buildTodayScheduledNotifications({ ...base, officialDistributions: [first, second] }).notifications)
    .toEqual(expect.arrayContaining([expect.objectContaining({ ex_date: '2026-10-01' }), expect.objectContaining({ ex_date: '2026-10-15' })]));
});

test('reports loading and failure without implying an empty schedule list is complete', () => {
  expect(buildTodayScheduledNotifications({ ...base, loading: true, officialDistributions: [] }).status).toBe('loading');
  expect(buildTodayScheduledNotifications({ ...base, officialDataError: '조회 실패', officialDistributions: [] }))
    .toMatchObject({ status: 'error', count: 0, message: expect.stringContaining('확인할 수 없습니다') });
  expect(buildTodayScheduledNotifications({ ...base, officialDistributions: [], officialSyncStatus: { status: 'failed' } }).status).toBe('sync-warning');
});
