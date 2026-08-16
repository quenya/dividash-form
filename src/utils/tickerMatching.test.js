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
        AAPL: { ticker: 'AAPL', sector: 'Mutable wrong sector', industry: 'Mutable wrong industry' },
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

  test('resolves a confirmed company-name alias selected from the input list', () => {
    const result = buildPortfolioSummary({
      data: [{ company_name: 'Apple Inc.', dividend_amount: 100, currency: 'KRW' }],
      exchangeRate: 1300,
      tickerMatchesMap: {
        'LEGACY FUND': {
          matched_ticker: 'AAPL',
          matched_company_name: 'Apple Inc.',
          status: 'confirmed',
          confidence: 'high',
          evidence: 'Issuer verified',
          market: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        },
      },
      tickersMap: {},
    });

    expect(result.sectorTableData[0]).toEqual(expect.objectContaining({
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      sector: 'Technology',
    }));
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

  test('does not classify manual-review input from existing ticker metadata', () => {
    const result = buildPortfolioSummary({
      data: [{ ticker: 'AMBIGUOUS', company_name: 'Ambiguous', dividend_amount: 100, currency: 'KRW' }],
      exchangeRate: 1300,
      tickerMatchesMap: {
        AMBIGUOUS: {
          status: 'manual_review',
          matched_ticker: 'AMBIGUOUS',
          confidence: 'medium',
          evidence: 'Needs confirmation',
        },
      },
      tickersMap: {
        AMBIGUOUS: { ticker: 'AMBIGUOUS', sector: 'Should remain hidden', industry: 'Should remain hidden' },
      },
    });

    expect(result.unknownItems).toEqual([
      expect.objectContaining({ ticker: 'AMBIGUOUS', sector: 'Unknown', industry: '-' }),
    ]);
  });

  test('does not classify an input without a match from existing ticker metadata', () => {
    const result = buildPortfolioSummary({
      data: [{ ticker: 'CATALOG ONLY', company_name: 'Catalog only', dividend_amount: 100, currency: 'KRW' }],
      exchangeRate: 1300,
      tickerMatchesMap: {},
      tickersMap: {
        'CATALOG ONLY': { ticker: 'CATALOG ONLY', sector: 'Mutable sector', industry: 'Mutable industry' },
      },
    });

    expect(result.unknownItems).toEqual([
      expect.objectContaining({ ticker: 'CATALOG ONLY', sector: 'Unknown', industry: '-' }),
    ]);
  });

  test('does not merge an unconfirmed source into a confirmed canonical ticker', () => {
    const result = buildPortfolioSummary({
      data: [
        { ticker: 'LEGACY NAME', company_name: 'Legacy name', dividend_amount: 100, currency: 'KRW' },
        { ticker: 'AAPL', company_name: 'AAPL', dividend_amount: 50, currency: 'KRW' },
      ],
      exchangeRate: 1300,
      tickerMatchesMap: {
        'LEGACY NAME': {
          status: 'confirmed',
          matched_ticker: 'AAPL',
          matched_company_name: 'Apple Inc.',
          market: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          confidence: 'high',
          evidence: 'Issuer verified',
        },
        AAPL: {
          status: 'manual_review',
          matched_ticker: 'AAPL',
          confidence: 'medium',
          evidence: 'Needs confirmation',
        },
      },
      tickersMap: {
        AAPL: { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
      },
    });

    expect(result.sectorTableData).toEqual(expect.arrayContaining([
      expect.objectContaining({ ticker: 'AAPL', amount: 100, sector: 'Technology', industry: 'Consumer Electronics' }),
      expect.objectContaining({ ticker: 'AAPL', amount: 50, sector: 'Unknown', matchStatus: 'manual_review' }),
    ]));
    expect(result.unknownItems).toHaveLength(1);
  });
});
