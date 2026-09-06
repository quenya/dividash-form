import { supabase as defaultClient } from './supabaseClient';

const ENTRY_COLUMNS = 'ticker,company_name,dividend_amount,payment_date,currency';
const PRODUCT_COLUMNS = 'ticker,issuer,product_name,official_url,isin,underlying_index,distribution_frequency,last_distribution_date,source_updated_at,fetched_at,expires_at,source_status';
const DISTRIBUTION_COLUMNS = 'ticker,ex_date,payment_date,distribution_per_share,reference_price,distribution_rate,currency,source_issuer,source_url,source_updated_at,fetched_at,parser_version';

function provenance(source, role, records, extra = {}) {
  return { source, role, recordCount: records.length, ...extra };
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isFuture(date, asOf) {
  return Boolean(date) && String(date) > asOf;
}

/**
 * Fetches the forecast boundary. RLS remains the authority for ownership;
 * user_id is deliberately not accepted as a filter or returned to callers.
 */
export async function fetchDividendForecastInputs({ client = defaultClient, ticker = null } = {}) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user) {
    return {
      status: 'cannot_calculate',
      reason: 'authentication_required',
      actualHistory: [], officialMetadata: [], officialDistributions: [], provenance: [],
    };
  }

  const entryQuery = client.from('dividend_entries').select(ENTRY_COLUMNS).order('payment_date', { ascending: true });
  const scopedEntryQuery = ticker ? entryQuery.eq('ticker', ticker) : entryQuery;
  const [{ data: entries, error: entriesError }, { data: metadata, error: metadataError }, { data: distributions, error: distributionsError }] = await Promise.all([
    scopedEntryQuery,
    (() => {
      const query = client.from('etf_product_cache').select(PRODUCT_COLUMNS);
      return ticker ? query.eq('ticker', ticker) : query;
    })(),
    (() => {
      const query = client.from('etf_distribution_history').select(DISTRIBUTION_COLUMNS).order('ex_date', { ascending: true });
      return ticker ? query.eq('ticker', ticker) : query;
    })(),
  ]);

  if (entriesError) throw entriesError;
  if (metadataError) throw metadataError;
  // Official history is optional reference data. A missing cache must not hide user history.
  const officialDistributions = distributionsError ? [] : (distributions || []);
  const actualHistory = entries || [];
  const officialMetadata = metadata || [];
  return {
    status: 'ready',
    actualHistory,
    officialMetadata,
    officialDistributions,
    provenance: [
      provenance('dividend_entries', 'actual_history', actualHistory, { ownership: 'authenticated_user_via_rls' }),
      provenance('etf_product_cache', 'official_metadata', officialMetadata, { readOnly: true }),
      provenance('etf_distribution_history', 'official_reference', officialDistributions, { readOnly: true }),
    ],
    warnings: distributionsError ? ['official_distribution_history_unavailable'] : [],
  };
}

/** Pure forecast contract: official distributions are never appended to actualHistory. */
export function calculateDividendForecast({ actualHistory = [], officialMetadata = [], officialDistributions = [] }, { asOf = new Date().toISOString().slice(0, 10), horizonMonths = 3 } = {}) {
  if (!Array.isArray(actualHistory) || actualHistory.length === 0) {
    return { status: 'cannot_calculate', reason: 'no_user_dividend_entries', actualHistory: [], forecast: [], assumptions: [], provenance: [] };
  }

  const amounts = actualHistory.map((entry) => asNumber(entry.dividend_amount)).filter((value) => value !== null);
  if (amounts.length === 0) {
    return { status: 'cannot_calculate', reason: 'user_entries_have_no_valid_amounts', actualHistory, forecast: [], assumptions: [], provenance: [] };
  }

  const futureReference = officialDistributions.filter((record) => isFuture(record.payment_date || record.ex_date, asOf));
  const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const forecast = futureReference.map((record) => ({
    ticker: record.ticker,
    payment_date: record.payment_date || null,
    estimated_amount: asNumber(record.distribution_per_share),
    currency: record.currency || 'KRW',
    source: 'official_reference',
  })).filter((record) => record.estimated_amount !== null);
  const assumptions = [];
  if (forecast.length === 0) {
    assumptions.push({ type: 'historical_average', value: averageAmount, horizonMonths });
    forecast.push({ estimated_amount: averageAmount, currency: actualHistory[0].currency || 'KRW', source: 'user_history_assumption' });
  }

  return {
    status: 'estimated_with_assumptions',
    actualHistory,
    forecast,
    assumptions,
    provenance: [
      provenance('dividend_entries', 'actual_history', actualHistory),
      provenance('etf_product_cache', 'official_metadata', officialMetadata, { readOnly: true }),
      provenance('etf_distribution_history', 'forecast_reference', futureReference, { readOnly: true }),
    ],
  };
}

export async function getDividendForecast(options = {}, forecastOptions = {}) {
  const inputs = await fetchDividendForecastInputs(options);
  if (inputs.status === 'cannot_calculate') return inputs;
  return calculateDividendForecast(inputs, forecastOptions);
}

export { ENTRY_COLUMNS, PRODUCT_COLUMNS, DISTRIBUTION_COLUMNS };
