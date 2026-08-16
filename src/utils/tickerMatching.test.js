import { buildPortfolioSummary } from './tickerMatching';

describe('buildPortfolioSummary', () => {
  test('uses only confirmed matches for canonical aggregation', () => {
    const result = buildPortfolioSummary({
      data: [
        { ticker: 'legacy fund', company_name: 'Legacy fund', dividend_amount: 100, currency: 'KRW' },
        { ticker: 'legacy fund', company_name: 'Legacy fund', dividend_amount: 25, currency: 'USD' },
      ],
      exchangeRate: 1300,
      tickerMatchesMap: {
        'LEGACY FUND': {
          source_input: 'LEGACY FUND',
          matched_ticker: 'AAPL',
          matched_company_name: 'Apple Inc.',
          market: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          status: 'confirmed',
          confidence: 'high',
          evidence: 'Exchange listing verified',
        },
      },
      tickersMap: {
        AAPL: { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
      },
    });

    expect(result.sectorTableData).toEqual([
      expect.objectContaining({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        amount: 32600,
        sourceInputs: ['legacy fund'],
      }),
    ]);
    expect(result.unknownItems).toHaveLength(0);
  });

  test('keeps manual-review matches in the original unknown bucket', () => {
    const result = buildPortfolioSummary({
      data: [{ ticker: 'unverified fund', company_name: 'Unverified fund', dividend_amount: 500, currency: 'KRW' }],
      exchangeRate: 1300,
      tickerMatchesMap: {
        'UNVERIFIED FUND': {
          source_input: 'UNVERIFIED FUND',
          matched_ticker: 'MSFT',
          matched_company_name: 'Possible match',
          status: 'manual_review',
          confidence: 'low',
          evidence: 'Name similarity only',
        },
      },
      tickersMap: {
        MSFT: { ticker: 'MSFT', sector: 'Technology', industry: 'Software' },
      },
    });

    expect(result.unknownItems).toEqual([
      expect.objectContaining({
        ticker: 'UNVERIFIED FUND',
        sourceInput: 'unverified fund',
        amount: 500,
        matchStatus: 'manual_review',
        confidence: 'low',
      }),
    ]);
    expect(result.sectorTableData[0].ticker).toBe('UNVERIFIED FUND');
    expect(result.sectorTableData[0].sector).toBe('Unknown');
  });
});
