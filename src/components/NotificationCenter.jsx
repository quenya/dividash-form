import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useDividendData } from '../hooks/useDividendData';
import { buildTodayScheduledNotifications } from '../utils/todayScheduledNotifications';

function NotificationCenter() {
  const { officialDistributions, eligibleEtfTickers, officialDataError, officialSyncStatus, loading, tickersMap, error, refetch } = useDividendData();
  const [localDate, setLocalDate] = useState(() => new Date().toDateString());

  useEffect(() => {
    let timer;
    let mounted = true;
    const scheduleMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        if (!mounted) return;
        setLocalDate(new Date().toDateString());
        refetch();
        scheduleMidnight();
      }, Math.max(1, midnight.getTime() - now.getTime() + 50));
    };
    scheduleMidnight();
    return () => { mounted = false; clearTimeout(timer); };
  }, [refetch]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const result = useMemo(() => buildTodayScheduledNotifications({
    officialDistributions, eligibleTickers: eligibleEtfTickers, officialDataError,
    officialSyncStatus, loading, tickersMap, error,
  }), [officialDistributions, eligibleEtfTickers, officialDataError, officialSyncStatus, loading, tickersMap, error, localDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen) refetch();
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button aria-label={`알림 ${result.count}개`} aria-expanded={isOpen} onClick={toggleOpen} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px', color: 'var(--text-secondary)' }}>
        {result.count > 0 ? <BellRing size={20} color="var(--accent-color)" /> : <Bell size={20} />}
        {result.count > 0 && <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#e74c3c', color: 'white', fontSize: '10px', padding: '2px 5px', borderRadius: '50%', fontWeight: 'bold' }}>{result.count}</span>}
      </button>
      {isOpen && <div style={{ position: 'absolute', top: '40px', right: '-10px', width: '280px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>오늘 공식 배당 예정 ({result.count})</div>
        <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>최근 배당 내역에서 확인된 ETF 기준이며 전체 보유 종목을 보장하지 않습니다.</div>
        {result.message && <div role={result.status === 'error' ? 'alert' : 'status'} style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{result.message}</div>}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {result.notifications.map((note) => <div key={`${note.ticker}-${note.ex_date || 'no-ex-date'}-${note.payment_date}-${note.source_issuer}`} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: 500 }}>{note.company_name || '종목명 확인 필요'} 배당 예정</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{note.payment_date} · {note.currency} {note.amount.toLocaleString()} / 주</div>
            <a href={note.source_url} target="_blank" rel="noreferrer">{note.source_issuer} 발행사 원본</a>
          </div>)}
          {!result.notifications.length && !result.message && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>오늘 공식 배당 예정 내역이 없습니다.</div>}
        </div>
      </div>}
    </div>
  );
}

export default NotificationCenter;
