import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const number = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits }) : '-';
const percent = (value) => Number.isFinite(Number(value)) ? `${number(value, 1)}%` : '비교 불가';

function TrendChart({ points, currency }) {
  if (!points || points.length < 2) return <p style={{ color: 'var(--text-secondary)' }}>지급일이 2개 이상인 데이터가 없어 트렌드를 표시할 수 없습니다.</p>;
  const data = { labels: points.map((point) => point.date), datasets: [{ label: `분배금 (${currency || '통화 미상'})`, data: points.map((point) => point.value), borderColor: '#4bc0c0', backgroundColor: 'rgba(75, 192, 192, 0.18)', pointBackgroundColor: '#4bc0c0', pointRadius: 4, pointHoverRadius: 7, tension: 0.3, fill: true }] };
  const options = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', labels: { color: '#666' } }, title: { display: false }, tooltip: { position: 'nearest', mode: 'index', intersect: false, backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 10, callbacks: { title: (context) => `지급일: ${context[0]?.label || ''}`, label: (context) => ` 분배금: ${number(context.raw, 2)} ${currency || ''}`, afterBody: (context) => { const rate = points[context[0]?.dataIndex]?.distributionRate; return ` 분배율: ${Number.isFinite(Number(rate)) ? `${number(rate, 2)}%` : '공식 정보 없음'}`; } } } }, scales: { x: { ticks: { color: '#666' }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { beginAtZero: true, ticks: { color: '#666', callback: (value) => number(value, 2) }, grid: { color: 'rgba(0,0,0,0.05)' }, title: { display: true, text: `분배금 (${currency || '통화 미상'})` } } } };
  return <div style={{ width: '100%', height: '280px' }}><Line data={data} options={options} /></div>;
}

function EtfCacheAnalytics({ items, analytics = [] }) {
  const [selectedTicker, setSelectedTicker] = useState(items[0]?.ticker || null);
  const labels = [
    ['최근 누적 배당금', (a) => a.total === null ? '-' : `${number(a.total, 2)} ${a.currency || ''}`],
    ['전월 대비 증가율', (a) => percent(a.growth)],
    ['입금 이벤트 수', (a) => `${number(a.eventCount)}회`],
    ['회당 평균 배당금', (a) => a.averagePayout === null ? '-' : `${number(a.averagePayout, 2)} ${a.currency || ''}`],
    ['배당 변동성(CV)', (a) => a.cv === null ? '데이터 부족' : percent(a.cv * 100)],
    ['평균 분배 간격', (a) => a.interval === null ? '데이터 부족' : `${number(a.interval, 1)}일`],
    ['상장 후 경과', (a) => a.listedDays === null ? '-' : `${number(a.listedDays)}일`],
    ['총보수 순위', (a) => a.feeRank === null ? '-' : `${number(a.feeRank)}위`],
    ['순자산 순위', (a) => a.aumRank === null ? '-' : `${number(a.aumRank)}위`],
    ['후보군 순자산 비중', (a) => a.aumShare === null ? '-' : percent(a.aumShare)],
  ];
  const analyticsMap = new Map(analytics.map((item) => [item.ticker, item]));
  const selectedItem = items.find((item) => item.ticker === selectedTicker) || items[0];
  const selectedAnalytics = selectedItem ? analyticsMap.get(selectedItem.ticker) || {} : {};

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>캐시 활용 ETF 분석</h3>
      <table className="portfolio-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
        <thead><tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
          <th style={{ padding: '10px' }}>종목명</th>
          {labels.map(([label]) => <th key={label} style={{ padding: '10px' }}>{label}</th>)}
        </tr></thead>
        <tbody>{items.map((item) => {
          const a = analyticsMap.get(item.ticker) || {};
          return <tr key={item.ticker} style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>
              <button type="button" onClick={() => setSelectedTicker(item.ticker)} style={{ padding: 0, border: 0, background: 'none', color: 'var(--accent-color)', cursor: 'pointer', textAlign: 'left' }}>
                {item.cache?.product_name || item.instrument?.name || item.companyNames?.[0] || item.ticker}
              </button>
            </td>
            {labels.map(([label, render]) => <td key={label} style={{ padding: '10px' }}>{render(a)}</td>)}
          </tr>;
        })}</tbody>
      </table>
      {selectedItem && (
        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: '0 0 6px' }}>{selectedItem.cache?.product_name || selectedItem.instrument?.name || selectedItem.companyNames?.[0]}</h4>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedItem.cache?.issuer || '-'} · {selectedItem.ticker}</div>
            </div>
            {selectedItem.cache?.official_url && <a href={selectedItem.cache.official_url} target="_blank" rel="noreferrer">공식 원본 보기</a>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px' }}>
            <div>최근 누적 배당금<br /><strong>{selectedAnalytics.total === null ? '-' : `${number(selectedAnalytics.total, 2)} ${selectedAnalytics.currency || ''}`}</strong></div>
            <div>전월 대비 증가율<br /><strong>{percent(selectedAnalytics.growth)}</strong></div>
            <div>입금 이벤트<br /><strong>{number(selectedAnalytics.eventCount)}회</strong></div>
            <div>회당 평균 배당금<br /><strong>{selectedAnalytics.averagePayout === null ? '-' : `${number(selectedAnalytics.averagePayout, 2)} ${selectedAnalytics.currency || ''}`}</strong></div>
            <div>평균 분배 간격<br /><strong>{selectedAnalytics.interval === null ? '데이터 부족' : `${number(selectedAnalytics.interval, 1)}일`}</strong></div>
            <div>배당 변동성(CV)<br /><strong>{selectedAnalytics.cv === null ? '데이터 부족' : percent(selectedAnalytics.cv * 100)}</strong></div>
            <div>상장 후 경과<br /><strong>{selectedAnalytics.listedDays === null ? '-' : `${number(selectedAnalytics.listedDays)}일`}</strong></div>
            <div>총보수 순위<br /><strong>{selectedAnalytics.feeRank === null ? '-' : `${number(selectedAnalytics.feeRank)}위`}</strong></div>
            <div>순자산 순위<br /><strong>{selectedAnalytics.aumRank === null ? '-' : `${number(selectedAnalytics.aumRank)}위`}</strong></div>
            <div>후보군 순자산 비중<br /><strong>{selectedAnalytics.aumShare === null ? '-' : percent(selectedAnalytics.aumShare)}</strong></div>
          </div>
          <details style={{ marginTop: '18px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>입력 원장 매칭 진단</summary>
            <div style={{ overflowX: 'auto', marginTop: '8px' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}><thead><tr><th>원본 ticker</th><th>종목명</th><th>지급일</th><th>금액</th><th>해석 ticker</th><th>차트</th></tr></thead><tbody>{(selectedAnalytics.sourceRows || []).map((row) => <tr key={`${row.date}-${row.amount}-${row.rawTicker}`}><td>{row.rawTicker || 'NULL'}</td><td>{row.companyName || '-'}</td><td>{row.date}</td><td>{row.amount === null ? '-' : `${number(row.amount, 2)} ${row.currency}`}</td><td>{selectedItem.ticker}</td><td>{row.inTrend ? '포함' : '제외'}</td></tr>)}</tbody></table></div>
          </details>
          <div style={{ marginTop: '18px' }}>
            <h5 style={{ margin: '0 0 8px' }}>최근 1년 분배금 트렌드</h5>
            <TrendChart points={selectedAnalytics.trend} currency={selectedAnalytics.currency} />
          </div>
        </div>
      )}
    </div>
  );
}

export default EtfCacheAnalytics;
