import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getDividendForecast } from '../api/dividendForecastService';
import { useAuth } from '../context/AuthContext';

const REASON_LABELS = {
  authentication_required: '로그인 후 사용자 배당 이력을 기준으로 계산할 수 있습니다.',
  no_user_dividend_entries: '사용자가 입력한 배당 이력이 없어 계산할 수 없습니다.',
  user_entries_have_no_valid_amounts: '입력된 배당 이력에서 유효한 금액을 찾지 못했습니다.',
};

function formatAmount(value, currency = 'KRW') {
  if (!Number.isFinite(Number(value))) return '-';
  return `${currency === 'KRW' ? '₩' : currency + ' '}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function firstUrl(result) {
  const metadataUrl = result.officialMetadata?.find((item) => item.official_url)?.official_url;
  const distributionUrl = result.officialDistributions?.find((item) => item.source_url)?.source_url;
  const forecastUrl = result.provenance?.find((item) => item.role === 'forecast_reference' && item.source_url)?.source_url;
  return metadataUrl || distributionUrl || forecastUrl || null;
}

function freshness(result) {
  const records = [...(result.officialMetadata || []), ...(result.officialDistributions || [])];
  const dates = records.map((item) => item.source_updated_at || item.fetched_at).filter(Boolean).sort();
  const date = dates.length ? dates[dates.length - 1] : null;
  return date;
}

export default function DividendForecast({ service = getDividendForecast }) {
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState({ status: 'loading', result: null, error: null });

  const load = async () => {
    if (authLoading) return;
    if (!session) {
      setState({ status: 'cannot_calculate', result: { status: 'cannot_calculate', reason: 'authentication_required' }, error: null });
      return;
    }
    setState({ status: 'loading', result: null, error: null });
    try {
      const result = await service({}, { horizonMonths: 3 });
      setState({ status: result.status, result, error: null });
    } catch (error) {
      setState({ status: 'error', result: null, error });
    }
  };

  useEffect(() => { load(); }, [session, authLoading]);

  const result = state.result;
  const url = useMemo(() => result && firstUrl(result), [result]);
  const updated = useMemo(() => result && freshness(result), [result]);

  return (
    <section className="card dividend-forecast" aria-labelledby="dividend-forecast-title">
      <div className="dividend-forecast-heading">
        <div>
          <h4 id="dividend-forecast-title">배당 전망</h4>
          <p className="dividend-forecast-subtitle">내 입력 이력과 공식 참고 전망을 분리해 표시합니다.</p>
        </div>
        <button type="button" onClick={load} disabled={state.status === 'loading' || authLoading} aria-label="전망 새로고침">
          <RefreshCw size={16} /> 새로고침
        </button>
      </div>

      {authLoading && <p role="status">인증 상태 확인 중...</p>}
      {!authLoading && state.status === 'loading' && <p role="status">배당 전망을 계산 중...</p>}
      {state.status === 'error' && (
        <div role="alert" className="dividend-forecast-message error"><AlertCircle size={18} /> 전망을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      )}
      {state.status === 'cannot_calculate' && (
        <div role="status" className="dividend-forecast-message"><AlertCircle size={18} /> {REASON_LABELS[result?.reason] || '현재 조건에서는 전망을 계산할 수 없습니다.'}</div>
      )}

      {result && (result.status === 'estimated_with_assumptions' || result.status === 'ready') && (
        <>
          <div className="dividend-forecast-columns">
            <div>
              <h5>실제 사용자 입력 이력</h5>
              <p>{result.actualHistory?.length || 0}건 · dividend_entries 기반</p>
            </div>
            <div>
              <h5>공식 참고 전망</h5>
              <p>{result.forecast?.length || 0}건 · 추정치이며 실제 이력에 저장하지 않음</p>
            </div>
          </div>
          {result.status === 'estimated_with_assumptions' && result.assumptions?.length > 0 && (
            <p className="dividend-forecast-assumption">가정: 최근 입력 금액 평균 {formatAmount(result.assumptions[0].value)} · 향후 {result.assumptions[0].horizonMonths}개월 참고</p>
          )}
          <ul className="dividend-forecast-list">
            {(result.forecast || []).map((item, index) => (
              <li key={`${item.ticker || 'estimate'}-${item.payment_date || index}`}>
                <span>{item.payment_date || '향후 지급일 미정'}</span>
                <strong>{formatAmount(item.estimated_amount, item.currency)}</strong>
                <small>{item.source === 'official_reference' ? '공식 참고' : '사용자 이력 평균 가정'}</small>
              </li>
            ))}
          </ul>
          <div className="dividend-forecast-provenance">
            <span>전망 기간: 향후 3개월</span>
            {updated && <span>참고 데이터 갱신: {updated}</span>}
            {url ? <a href={url} target="_blank" rel="noreferrer">공식 원본 보기 <ExternalLink size={13} /></a> : <span>공식 원본 링크 없음</span>}
          </div>
          {result.warnings?.length > 0 && <p className="dividend-forecast-warning">공식 분배 이력을 확인할 수 없어 사용자 이력 가정만 표시할 수 있습니다.</p>}
        </>
      )}
    </section>
  );
}
