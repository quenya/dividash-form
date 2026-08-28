import { getRecentEtfCandidates, subtractOneMonth } from './recentEtfCandidates';

describe('subtractOneMonth', () => {
  test('clamps to the last day of a shorter target month', () => {
    expect(subtractOneMonth(new Date('2026-03-31T00:00:00Z')).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('getRecentEtfCandidates', () => {
  const instruments = [
    { symbol: '069500', name: 'KODEX 200', security_type: 'ETF' },
    { symbol: '123456', name: '일반 주식', security_type: 'STOCK' },
    { symbol: '458730', name: 'TIGER ETF', security_type: 'ETF' },
  ];

  test('uses today as the one-month reference window', () => {
    const result = getRecentEtfCandidates([
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-07-31' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-07-31' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-07-01' },
      { ticker: '458730', company_name: 'TIGER ETF', payment_date: '2026-06-30' },
      { ticker: '123456', company_name: '일반 주식', payment_date: '2026-07-15' },
    ], instruments, new Date('2026-08-28T00:00:00Z'));

    expect(result.referenceDate).toBe('2026-08-28');
    expect(result.periodStart).toBe('2026-06-30');
    expect(result.items).toEqual([
      {
        ticker: '069500', companyNames: ['KODEX 200'], paymentDates: ['2026-07-01', '2026-07-31'], entryCount: 2, instrument: instruments[0],
      },
      {
        ticker: '458730', companyNames: ['TIGER ETF'], paymentDates: ['2026-06-30'], entryCount: 1, instrument: instruments[2],
      },
    ]);

    expect(getRecentEtfCandidates([
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-07-31' },
    ], instruments, new Date('2026-08-28T00:00:00Z'), [], 3).periodStart).toBe('2026-04-30');
  });

  test('returns an empty result when no dated ticker entries exist', () => {
    expect(getRecentEtfCandidates([{ ticker: null, payment_date: null }])).toEqual({
      referenceDate: null,
      periodStart: null,
      items: [],
    });
  });

  test('resolves a missing dividend ticker from a confirmed company match', () => {
    const result = getRecentEtfCandidates(
      [{ ticker: null, company_name: 'RISE 삼성전자SK하이닉스채권혼합', payment_date: '2026-08-04' }],
      [{ symbol: '0162Z0', name: 'RISE 삼성전자SK하이닉스채권혼합', security_type: 'ETF' }],
      new Date('2026-08-28T00:00:00Z'),
      [{
        source_input: 'RISE 삼성전자SK하이닉스채권혼합',
        matched_ticker: '0162Z0',
        status: 'confirmed',
        confidence: 'high',
      }],
    );

    expect(result.items[0].ticker).toBe('0162Z0');
  });
});
