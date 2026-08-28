import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRecentEtfCandidates } from '../hooks/useRecentEtfCandidates';
import EtfCacheAnalytics from './EtfCacheAnalytics';

function RecentEtfCandidates() {
  const [windowMonths, setWindowMonths] = useState(1);
  const { referenceDate, periodStart, items, analytics, loading, error, refetch } = useRecentEtfCandidates(windowMonths);

  if (loading) return <div className="card">최근 ETF 후보를 불러오는 중...</div>;
  if (error) return <div className="card">ETF 후보를 불러오지 못했습니다: {error.message}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 8px' }}>ETF 분석</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              분석 대상 기간: {periodStart || '-'} ~ {referenceDate || '-'} · 최근 지급 데이터에서 식별된 ETF
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div role="group" aria-label="분석 기간 선택" style={{ display: 'flex', gap: '4px' }}>
              {[1, 3, 6].map((months) => (
                <button key={months} type="button" onClick={() => setWindowMonths(months)} aria-pressed={windowMonths === months}>
                  {months}개월
                </button>
              ))}
            </div>
            <button type="button" onClick={refetch} aria-label="ETF 분석 새로고침" title="새로고침">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <EtfCacheAnalytics items={items} analytics={analytics} />
    </div>
  );
}

export default RecentEtfCandidates;
