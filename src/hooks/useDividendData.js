import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

export function useDividendData() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exchangeRate, setExchangeRate] = useState(1300);
    const [tickersMap, setTickersMap] = useState({});

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
            if (json?.rates?.KRW) {
                setExchangeRate(json.rates.KRW);
            }
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
                .from('dividend_entries')
                .select('*')
                .order('payment_date', { ascending: false });

            if (supabaseError) throw supabaseError;

            setData(dividendData || []);

            const { data: tData } = await supabase.from('tickers').select('*');
            const tMap = {};
            (tData || []).forEach(t => {
                if (t.ticker) tMap[t.ticker.toUpperCase().trim()] = t;
            });
            setTickersMap(tMap);

        } catch (err) {
            console.error('Error fetching dividend data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, exchangeRate, tickersMap, refetch: fetchData };
}
