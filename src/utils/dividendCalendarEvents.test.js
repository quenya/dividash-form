import { buildDividendCalendarEvents, getRecentEtfCandidateSymbols, resolveRecentEtfTickers } from './dividendCalendarEvents';

const confirmedMatch = {
  source_input: 'Acme ETF',
  matched_ticker: '069500',
  status: 'confirmed',
  confidence: 'high',
  matched_company_name: 'Acme ETF',
  market: 'KOSPI',
  sector: 'ETF',
  industry: 'Fund',
  evidence: 'Official product page',
};

describe('resolveRecentEtfTickers', () => {
  test('deduplicates confirmed ETF tickers from payments in the last month', () => {
    const result = resolveRecentEtfTickers({
      entries: [
        { ticker: ' 069500 ', payment_date: '2026-10-01' },
        { ticker: '069500', payment_date: '2026-10-12' },
        { ticker: '0162Z0', payment_date: '2026-09-01' },
      ],
      instruments: [
        { symbol: '069500', security_type: 'ETF' },
        { symbol: '0162Z0', security_type: 'ETF' },
      ],
      now: new Date('2026-10-16T12:00:00'),
    });
    expect(result).toEqual(['069500']);
  });

  test('resolves a missing ticker only through a verified exact-name match', () => {
    const entries = [{ ticker: null, company_name: ' acme etf ', payment_date: '2026-10-10' }];
    const instruments = [{ symbol: '069500', security_type: '상장지수펀드' }];
    expect(getRecentEtfCandidateSymbols(entries, [confirmedMatch], new Date('2026-10-16T12:00:00'))).toEqual(['069500']);
    expect(resolveRecentEtfTickers({ entries, instruments, matches: [confirmedMatch], now: new Date('2026-10-16T12:00:00') })).toEqual(['069500']);
  });

  test('rejects ambiguous and unverified matches and non-ETF instruments', () => {
    const entries = [
      { ticker: null, company_name: 'Acme ETF', payment_date: '2026-10-10' },
      { ticker: '123456', payment_date: '2026-10-11' },
    ];
    const ambiguousMatches = [confirmedMatch, { ...confirmedMatch, matched_ticker: '999999' }];
    const unverified = { ...confirmedMatch, status: 'manual_review' };
    expect(getRecentEtfCandidateSymbols(entries, ambiguousMatches, new Date('2026-10-16T12:00:00'))).toEqual(['123456']);
    expect(getRecentEtfCandidateSymbols(entries, [unverified], new Date('2026-10-16T12:00:00'))).toEqual(['123456']);
    expect(resolveRecentEtfTickers({ entries, instruments: [{ symbol: '123456', security_type: 'common stock' }], now: new Date('2026-10-16T12:00:00') })).toEqual([]);
  });
});

describe('buildDividendCalendarEvents', () => {
  test('keeps a current-month official schedule next to, not combined with, the actual deposit', () => {
    const events = buildDividendCalendarEvents({
      actualEntries: [{ id: 'actual-1', ticker: '069500', payment_date: '2026-10-20', dividend_amount: 5000, currency: 'KRW' }],
      officialDistributions: [
        { ticker: '069500', ex_date: '2026-10-10', payment_date: '2026-10-20', distribution_per_share: 125, currency: 'KRW', source_url: 'https://issuer.example/069500', source_issuer: 'KODEX' },
        { ticker: '069500', ex_date: '2026-09-10', payment_date: '2026-09-20', distribution_per_share: 120, currency: 'KRW', source_url: 'https://issuer.example/069500', source_issuer: 'KODEX' },
        { ticker: '0162Z0', ex_date: '2026-10-10', payment_date: '2026-10-20', distribution_per_share: 80, currency: 'KRW', source_url: 'https://issuer.example/0162Z0', source_issuer: 'RISE' },
      ],
      eligibleTickers: ['069500'],
      now: new Date('2026-10-16T12:00:00'),
    });

    expect(events).toEqual([
      expect.objectContaining({ type: 'scheduled', ticker: '069500', payment_date: '2026-10-20', amount: 125, source_url: 'https://issuer.example/069500' }),
      expect.objectContaining({ type: 'actual', id: 'actual-1', payment_date: '2026-10-20', amount: 5000 }),
    ]);
  });

  test('does not create a scheduled event with incomplete official evidence', () => {
    const events = buildDividendCalendarEvents({
      actualEntries: [],
      officialDistributions: [{ ticker: '069500', payment_date: '2026-10-20', distribution_per_share: 125, source_url: '' }],
      eligibleTickers: ['069500'],
      now: new Date('2026-10-16T12:00:00'),
    });
    expect(events).toEqual([]);
  });
});
