import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import { buildTickerMatchesMap } from '../utils/tickerMatching';
import { getRecentEtfCandidateSymbols, resolveRecentEtfTickers } from '../utils/dividendCalendarEvents';

export function useDividendData() {
    const [data, setData] = useState([]);
    const [officialDistributions, setOfficialDistributions] = useState([]);
    const [eligibleEtfTickers, setEligibleEtfTickers] = useState([]);
    const [officialDataError, setOfficialDataError] = useState(null);
    const [officialSyncStatus, setOfficialSyncStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exchangeRate, setExchangeRate] = useState(1300);
    const [tickersMap, setTickersMap] = useState({});
    const [tickerMatchesMap, setTickerMatchesMap] = useState({});

    const fetchExchangeRate = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Failed to fetch exchange rate');
            const json = await res.json();
            if (json?.rates?.KRW) setExchangeRate(json.rates.KRW);
        } catch (e) {
            console.warn('Exchange rate fetch failed, using default:', e);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await fetchExchangeRate();
            const { data: dividendData, error: supabaseError } = await supabase
                .from('dividend_entries').select('*').order('payment_date', { ascending: false });
            if (supabaseError) throw supabaseError;
            const entries = dividendData || [];
            setData(entries);

            const { data: tData } = await supabase.from('tickers').select('*');
            const tMap = {};
            (tData || []).forEach(t => {
                if (t.ticker) tMap[t.ticker.toUpperCase().trim()] = t;
            });
            setTickersMap(tMap);

            const { data: matchData, error: matchError } = await supabase
                .from('ticker_matches')
                .select('source_input, matched_company_name, matched_ticker, market, sector, industry, evidence, confidence, status');
            if (matchError) {
                console.warn('종목 매칭 정보 조회 오류:', matchError.message);
                setTickerMatchesMap({});
            } else {
                setTickerMatchesMap(buildTickerMatchesMap(matchData));
            }

            const candidateTickers = getRecentEtfCandidateSymbols(entries, matchData || []);
            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
            const [distributionResult, instrumentResult, syncStatusResult] = await Promise.all([
                candidateTickers.length
                    ? supabase.from('etf_distribution_history')
                        .select('ticker,ex_date,payment_date,distribution_per_share,currency,source_issuer,source_url,fetched_at,source_updated_at')
                        .in('ticker', candidateTickers)
                        .gte('payment_date', monthStart)
                        .lt('payment_date', nextMonthStart)
                        .order('payment_date', { ascending: true })
                    : Promise.resolve({ data: [], error: null }),
                candidateTickers.length
                    ? supabase.from('instrument_search_index').select('symbol,security_type').in('symbol', candidateTickers)
                    : Promise.resolve({ data: [], error: null }),
                supabase.from('etf_sync_status_public')
                    .select('status,finished_at,has_coverage_gaps')
                    .limit(1)
                    .maybeSingle(),
            ]);
            setOfficialSyncStatus(syncStatusResult.error ? null : syncStatusResult.data);
            if (distributionResult.error) {
                console.warn('공식 ETF 분배 내역 조회 오류:', distributionResult.error.message);
                setOfficialDistributions([]);
                setOfficialDataError('공식 배당 예정 내역을 조회할 수 없습니다.');
            } else {
                setOfficialDistributions(distributionResult.data || []);
                setOfficialDataError(null);
            }
            if (instrumentResult.error) {
                console.warn('ETF 종목 유형 확인 오류:', instrumentResult.error.message);
                setEligibleEtfTickers([]);
                setOfficialDataError('최근 배당 ETF 종목을 확인할 수 없습니다.');
            } else {
                setEligibleEtfTickers(resolveRecentEtfTickers({ entries, instruments: instrumentResult.data || [] }));
            }
        } catch (err) {
            console.error('Error fetching dividend data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    return { data, officialDistributions, eligibleEtfTickers, officialDataError, officialSyncStatus, loading, error, exchangeRate, tickersMap, tickerMatchesMap, refetch: fetchData };
}
