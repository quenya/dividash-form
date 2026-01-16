import React from 'react';

function KPICard({ title, value, change, format = 'text', icon: Icon }) {
    const isPositive = typeof change === 'number' && change >= 0;

    return (
        <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
                {Icon && <Icon size={18} />}
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {value}
            </div>

            {change !== undefined && (
                <div style={{
                    fontSize: '0.85rem',
                    color: isPositive ? '#2ecc71' : '#e74c3c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {isPositive ? '▲' : '▼'} {Math.abs(change)}%
                    <span style={{ color: 'var(--text-secondary)' }}> vs last year</span>
                </div>
            )}
        </div>
    );
}

export default KPICard;
