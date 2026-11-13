import { renderHook, waitFor } from '@testing-library/react';
import { useDividendData } from './useDividendData';
import { supabase } from '../api/supabaseClient';

jest.mock('../api/supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const query = () => {
  const q = {};
  ['select', 'order', 'in', 'gte', 'lt', 'limit'].forEach((method) => { q[method] = jest.fn(() => q); });
  q.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
  q.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve);
  return q;
};

test('queries official schedules for this and next month and maps confirmed names to eligible ETFs', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: { KRW: 1300 } }) });
  jest.useFakeTimers().setSystemTime(new Date(2026, 11, 16, 12));
  const dividendQuery = query();
  const tickersQuery = query();
  const matchesQuery = query();
  const distributionsQuery = query();
  const historicalDistributionsQuery = query();
  let distributionsCallCount = 0;
  const instrumentsQuery = query();
  const statusQuery = query();
  const productsQuery = query();
  const byTable = {
    dividend_entries: dividendQuery,
    tickers: tickersQuery,
    ticker_matches: matchesQuery,
    etf_distribution_history: distributionsQuery,
    instrument_search_index: instrumentsQuery,
    etf_sync_status_public: statusQuery,
    etf_product_cache: productsQuery,
  };
  supabase.from.mockImplementation((table) => {
    if (table === 'etf_distribution_history') {
      distributionsCallCount += 1;
      return distributionsCallCount === 1 ? distributionsQuery : historicalDistributionsQuery;
    }
    return byTable[table];
  });
  dividendQuery.then = (resolve) => Promise.resolve({ data: [
    { company_name: 'Acme ETF', ticker: '069500', payment_date: '2026-12-10' },
    { company_name: 'Acme ETF', ticker: '069500', payment_date: '2025-02-10' },
  ], error: null }).then(resolve);
  matchesQuery.then = (resolve) => Promise.resolve({ data: [{ source_input: 'Acme ETF', matched_company_name: 'Acme ETF', matched_ticker: '069500', market: 'KOSPI', sector: 'ETF', industry: 'Fund', evidence: 'issuer', confidence: 'high', status: 'confirmed' }], error: null }).then(resolve);
  distributionsQuery.then = (resolve) => Promise.resolve({ data: [{ ticker: '069500', ex_date: '2026-12-01', payment_date: '2026-12-10', distribution_per_share: 100, source_issuer: 'KODEX', source_url: 'https://issuer.example' }], error: null }).then(resolve);
  historicalDistributionsQuery.then = (resolve) => Promise.resolve({ data: [{ ticker: '069500', ex_date: '2025-02-03', payment_date: '2025-02-10', distribution_per_share: 80, source_issuer: 'KODEX', source_url: 'https://issuer.example/historical' }], error: null }).then(resolve);
  instrumentsQuery.then = (resolve) => Promise.resolve({ data: [{ symbol: '069500', security_type: 'ETF' }], error: null }).then(resolve);
  productsQuery.then = (resolve) => Promise.resolve({ data: [{ ticker: '069500', product_name: 'KODEX 200', source_status: 'matched' }], error: null }).then(resolve);
  const { result } = renderHook(() => useDividendData());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(distributionsQuery.gte).toHaveBeenCalledWith('payment_date', '2026-12-01');
  expect(distributionsQuery.lt).toHaveBeenCalledWith('payment_date', '2027-02-01');
  expect(distributionsQuery.in).toHaveBeenCalledWith('ticker', ['069500']);
  expect(historicalDistributionsQuery.in).toHaveBeenCalledWith('ticker', ['069500']);
  expect(historicalDistributionsQuery.in).toHaveBeenCalledWith('payment_date', ['2025-02-10']);
  expect(productsQuery.select).toHaveBeenCalledWith('ticker,product_name,source_status');
  expect(result.current.officialDistributions).toEqual(expect.arrayContaining([
    expect.objectContaining({ payment_date: '2025-02-10', product_name: 'KODEX 200' }),
  ]));
  expect(result.current.eligibleEtfTickers).toEqual(['069500']);
  jest.useRealTimers();
});
