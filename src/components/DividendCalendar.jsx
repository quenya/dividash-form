import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/CalendarOverride.css';
import { useDividendData } from '../hooks/useDividendData';
import { buildDividendCalendarEvents } from '../utils/dividendCalendarEvents';

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function amountLabel(value, currency = 'KRW', type) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '금액 확인 불가';
    const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
    if (type === 'scheduled') return `${currency || 'KRW'} ${formatted} / 주`;
    return `${currency === 'USD' ? '$' : currency === 'KRW' ? '₩' : `${currency} `}${formatted}`;
}

function DividendCalendar() {
    const { data, officialDistributions, eligibleEtfTickers, officialDataError, loading, error, exchangeRate } = useDividendData();
    const [date, setDate] = useState(new Date());

    const events = useMemo(() => buildDividendCalendarEvents({
        actualEntries: data,
        officialDistributions,
        eligibleTickers: eligibleEtfTickers,
    }), [data, officialDistributions, eligibleEtfTickers]);

    const eventsByDate = useMemo(() => events.reduce((map, event) => {
        if (!map[event.payment_date]) map[event.payment_date] = [];
        map[event.payment_date].push(event);
        return map;
    }, {}), [events]);

    const tileContent = ({ date: tileDate, view }) => {
        if (view !== 'month') return null;
        return eventsByDate[localDateString(tileDate)]?.length
            ? <div className="dividend-marker" aria-label="배당 예정 또는 입금 내역" />
            : null;
    };

    const selectedDateStr = localDateString(date);
    const selectedEvents = eventsByDate[selectedDateStr] || [];
    const actualTotalKrw = selectedEvents.reduce((sum, item) => {
        if (item.type !== 'actual') return sum;
        const amount = Number(item.dividend_amount) || 0;
        return sum + Math.round(item.currency === 'USD' ? amount * exchangeRate : amount);
    }, 0);

    return (
        <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>배당 캘린더</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    예정은 공식 주당 분배금, 실제는 계좌 입금액입니다.
                </p>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Calendar onChange={setDate} value={date} tileContent={tileContent} formatDay={(locale, day) => day.getDate()} />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>{date.toLocaleDateString()} 배당금</span>
                        <span style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>
                            실제 입금 합계: ₩ {actualTotalKrw.toLocaleString()}
                        </span>
                    </h4>

                    {officialDataError && <p role="status" style={{ color: '#9a6700' }}>{officialDataError}</p>}
                    {loading ? (
                        <p role="status">데이터 로딩 중...</p>
                    ) : error ? (
                        <p role="alert" style={{ color: '#d32f2f' }}>배당 캘린더 데이터를 불러오지 못했습니다.</p>
                    ) : selectedEvents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedEvents.map((item, idx) => (
                                <div key={item.type === 'actual' ? `actual-${item.id || idx}` : `scheduled-${item.ticker}-${item.ex_date}-${item.source_issuer}`} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                    padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px',
                                    borderLeft: `4px solid ${item.type === 'scheduled' ? 'var(--accent-color)' : 'var(--border-color)'}`
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={{ fontWeight: 'bold' }}>{item.company_name || item.ticker || '종목 미확인'}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {item.type === 'scheduled' ? '예정 · 공식 주당 분배금' : `실제 입금${item.account_name ? ` · ${item.account_name}` : ''}`}
                                        </span>
                                        {item.type === 'scheduled' && item.source_url && (
                                            <a href={item.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem' }}>발행사 공식 내역</a>
                                        )}
                                    </div>
                                    <strong style={{ whiteSpace: 'nowrap' }}>{amountLabel(item.amount, item.currency, item.type)}</strong>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                            이 날짜에는 배당 예정 또는 입금 기록이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DividendCalendar;
