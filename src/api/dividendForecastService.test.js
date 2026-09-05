jest.mock('./supabaseClient', () => ({ supabase: {} }));

import {
  calculateDividendForecast,
  fetchDividendForecastInputs,
  getDividendForecast,
} from './dividendForecastService';

function resolved(data = [], error = null) {
  const query = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    eq: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
  };
  return query;
}

function clientFor(tables, user = { id: 'user-a' }) {
  return {
    auth: { getUser: jest.fn(() => Promise.resolve({ data: { user }, error: null })) },
    from: jest.fn((name) => tables[name] || resolved()),
  };
}

test('requires an authenticated user before reading personal data', async () => {
  const client = clientFor({}, null);
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const result = await fetchDividendForecastInputs({ client });
  expect(result.status).toBe('cannot_calculate');
  expect(client.from).not.toHaveBeenCalled();
});

test('reads user entries and official tables through read-only queries', async () => {
  const entries = [{ ticker: '069500', dividend_amount: 100, payment_date: '2026-01-10', currency: 'KRW' }];
  const metadata = [{ ticker: '069500', product_name: 'KODEX 200', official_url: 'https://example.test' }];
  const distributions = [{ ticker: '069500', ex_date: '2026-10-01', distribution_per_share: 120, source_url: 'https://example.test/d' }];
  const client = clientFor({
    dividend_entries: resolved(entries),
    etf_product_cache: resolved(metadata),
    etf_distribution_history: resolved(distributions),
  });
  const result = await fetchDividendForecastInputs({ client, ticker: '069500' });
  expect(result.actualHistory).toEqual(entries);
  expect(result.officialMetadata).toEqual(metadata);
  expect(result.officialDistributions).toEqual(distributions);
  expect(result.provenance.map((item) => item.role)).toEqual(['actual_history', 'official_metadata', 'official_reference']);
  expect(client.from('dividend_entries').eq).toHaveBeenCalledWith('ticker', '069500');
});

test('does not mix official distributions into actual history', () => {
  const actualHistory = [{ ticker: '069500', dividend_amount: 100, payment_date: '2026-01-10', currency: 'KRW' }];
  const result = calculateDividendForecast({ actualHistory, officialMetadata: [], officialDistributions: [{ ticker: '069500', ex_date: '2026-10-01', distribution_per_share: 120, currency: 'KRW' }] }, { asOf: '2026-09-01' });
  expect(result.status).toBe('estimated_with_assumptions');
  expect(result.actualHistory).toBe(actualHistory);
  expect(result.actualHistory).not.toContainEqual(expect.objectContaining({ distribution_per_share: 120 }));
  expect(result.forecast[0].source).toBe('official_reference');
});

test('uses explicit historical assumptions when no future official reference exists', () => {
  const result = calculateDividendForecast({ actualHistory: [
    { dividend_amount: 100, currency: 'KRW' },
    { dividend_amount: 200, currency: 'KRW' },
  ], officialMetadata: [], officialDistributions: [] });
  expect(result.status).toBe('estimated_with_assumptions');
  expect(result.assumptions).toEqual([{ type: 'historical_average', value: 150, horizonMonths: 3 }]);
  expect(result.forecast[0]).toEqual(expect.objectContaining({ estimated_amount: 150, source: 'user_history_assumption' }));
});

test('reports cannot_calculate for empty or invalid user history', () => {
  expect(calculateDividendForecast({ actualHistory: [] }).reason).toBe('no_user_dividend_entries');
  expect(calculateDividendForecast({ actualHistory: [{ dividend_amount: 'not-a-number' }] }).reason).toBe('user_entries_have_no_valid_amounts');
});

test('preserves user data when optional official history query is unavailable', async () => {
  const client = clientFor({
    dividend_entries: resolved([{ dividend_amount: 100 }]),
    etf_product_cache: resolved([]),
    etf_distribution_history: resolved(null, { code: '42501', message: 'permission denied' }),
  });
  const result = await getDividendForecast({ client });
  expect(result.status).toBe('estimated_with_assumptions');
  expect(result.provenance[0].source).toBe('dividend_entries');
  expect(result.provenance[2].recordCount).toBe(0);
});

test('surfaces RLS errors for the private dividend table', async () => {
  const rlsError = { code: '42501', message: 'new row violates row-level security policy' };
  const client = clientFor({
    dividend_entries: resolved(null, rlsError),
    etf_product_cache: resolved([]),
    etf_distribution_history: resolved([]),
  });
  await expect(fetchDividendForecastInputs({ client })).rejects.toEqual(rlsError);
});
