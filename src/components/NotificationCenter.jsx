import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useDividendData } from '../hooks/useDividendData';

function NotificationCenter() {
    const { data } = useDividendData();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Check for upcoming dividends (next 7 days) or Just Received (last 3 days)
        // Here we simulate "alerts" from the data.
        // In a real app, we would track "read" status in DB or LocalStorage.
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // Simple logic: Find dividends paying in next 7 days
        const alerts = [];

        data.forEach(item => {
            if (!item.payment_date) return;
            const pDate = new Date(item.payment_date);
            const timeDiff = pDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysDiff >= 0 && daysDiff <= 7) {
                alerts.push({
                    id: item.id || Math.random(),
                    message: `${item.company_name} 배당 예정`,
                    sub: `${item.payment_date} • ₩${Number(item.dividend_amount).toLocaleString()}`,
                    type: 'upcoming'
                });
            }
        });

        setNotifications(alerts);
        setUnreadCount(alerts.length);

    }, [data]);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px',
                    color: 'var(--text-secondary)'
                }}
            >
                {unreadCount > 0 ? <BellRing size={20} color="var(--accent-color)" /> : <Bell size={20} />}
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 5px',
                        borderRadius: '50%',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: '-10px', // or left depending on placement
                    width: '280px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        알림 ({notifications.length})
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {notifications.length > 0 ? (
                            notifications.map((note, idx) => (
                                <div key={idx} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                    <div style={{ fontWeight: '500' }}>{note.message}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{note.sub}</div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                새로운 알림이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationCenter;
