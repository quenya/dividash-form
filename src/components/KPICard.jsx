import React from 'react';

function KPICard({ title, value, change, comparisonValue, format = 'text', icon: Icon }) {
    const hasComparison = typeof change === 'number'
        && Number.isFinite(change)
        && typeof comparisonValue === 'number'
        && Number.isFinite(comparisonValue)
        && comparisonValue > 0;
    const isPositive = hasComparison && change >= 0;

    return (
        <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
                {Icon && <Icon size={18} />}
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {value}
            </div>

            {hasComparison && (
                <div style={{
                    fontSize: '0.85rem',
                    color: isPositive ? '#2ecc71' : '#e74c3c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                    lineHeight: 1.4
                }}>
                    <span>
                        전년 동기 대비 {isPositive ? '▲' : '▼'}{Math.abs(change)}%
                        {' '}(작년 동기 ₩ {comparisonValue.toLocaleString()})
                    </span>
                </div>
            )}
        </div>
    );
}

export default KPICard;
