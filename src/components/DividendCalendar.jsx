import React, { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/CalendarOverride.css';
import { useDividendData } from '../hooks/useDividendData';
import { DollarSign } from 'lucide-react';

function DividendCalendar() {
    const { data, loading, exchangeRate } = useDividendData();
    const [date, setDate] = useState(new Date());

    // Group data by date string YYYY-MM-DD
    const dividendsByDate = useMemo(() => {
        const map = {};
        data.forEach(item => {
            if (!item.payment_date) return;
            // payment_date is YYYY-MM-DD
            const dateStr = item.payment_date;
            if (!map[dateStr]) map[dateStr] = [];

            let amount = Number(item.dividend_amount) || 0;
            if (item.currency === 'USD') amount = amount * exchangeRate;

            map[dateStr].push({
                ...item,
                amountKRW: Math.round(amount)
            });
        });
        return map;
    }, [data, exchangeRate]);

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            const dateStr = offsetDate.toISOString().split('T')[0];
            const dividends = dividendsByDate[dateStr];

            if (dividends && dividends.length > 0) {
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                        <div className="dividend-marker"></div>
                    </div>
                );
            }
        }
        return null;
    };

    const selectedDateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const selectedDividends = dividendsByDate[selectedDateStr] || [];

    const totalAmount = selectedDividends.reduce((sum, item) => sum + item.amountKRW, 0);

    return (
        <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>배당 캘린더</h3>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Calendar
                        onChange={setDate}
                        value={date}
                        tileContent={tileContent}
                        formatDay={(locale, date) => date.getDate()}
                    />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{date.toLocaleDateString()} 배당금</span>
                        <span style={{ color: 'var(--accent-color)' }}>Total: ₩ {totalAmount.toLocaleString()}</span>
                    </h4>

                    {loading ? (
                        <p>데이터 로딩 중...</p>
                    ) : selectedDividends.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedDividends.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold' }}>{item.company_name || item.ticker}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.account_name}</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '14px' }}>{item.currency === 'USD' ? '$' : '₩'}</span>
                                        {Number(item.dividend_amount).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                            이 날짜에는 배당금 기록이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DividendCalendar;
