import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { getRecentEtfCandidates } from '../utils/recentEtfCandidates';
import { buildEtfCacheAnalytics } from '../utils/etfCacheAnalytics';

export function useRecentEtfCandidates(windowMonths = 1) {
  const [result, setResult] = useState({ referenceDate: null, periodStart: null, items: [], analytics: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: entries, error: entriesError },
        { data: cache, error: cacheError },
        { data: matches, error: matchesError },
        { data: distributionHistory, error: distributionHistoryError },
      ] = await Promise.all([
        supabase.from('dividend_entries').select('ticker,company_name,dividend_amount,payment_date,currency').order('payment_date', { ascending: false }),
        supabase.from('etf_product_cache').select('*'),
        supabase.from('ticker_matches').select('source_input,matched_ticker,matched_company_name,status,confidence'),
        supabase.from('etf_distribution_history').select('ticker,ex_date,payment_date,distribution_per_share,reference_price,distribution_rate,currency,source_issuer,source_url'),
      ]);
      if (entriesError) throw entriesError;
      if (cacheError) throw cacheError;
      if (matchesError) throw matchesError;
      const safeDistributionHistory = distributionHistoryError ? [] : (distributionHistory || []);
      const candidateTickers = [...new Set((entries || [])
        .map((entry) => String(entry.ticker || '').trim().toUpperCase())
        .filter(Boolean)
        .concat((matches || []).map((match) => String(match.matched_ticker || '').trim().toUpperCase()))
        .filter(Boolean))];
      const { data: instruments, error: instrumentsError } = candidateTickers.length
        ? await supabase
          .from('instrument_search_index')
          .select('symbol,name,market,security_type,isin_code')
          .in('symbol', candidateTickers)
        : { data: [], error: null };
      if (instrumentsError) throw instrumentsError;

      const nextResult = getRecentEtfCandidates(entries || [], instruments || [], new Date(), matches || [], windowMonths);
      const cacheMap = new Map((cache || []).map((item) => [String(item.ticker).trim().toUpperCase(), item]));
      const enrichedItems = nextResult.items.map((item) => ({ ...item, cache: cacheMap.get(item.ticker) || null }));
      const analytics = buildEtfCacheAnalytics({ entries: entries || [], items: enrichedItems, asOfDate: new Date(), matches: matches || [], distributions: safeDistributionHistory, windowMonths });
      setResult({
        ...nextResult,
        analytics,
        items: enrichedItems,
      });
    } catch (fetchError) {
      console.error('최근 ETF 후보 조회 오류:', fetchError);
      setError(fetchError);
    } finally {
      setLoading(false);
    }
  }, [windowMonths]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  return { ...result, loading, error, refetch: fetchCandidates };
}
