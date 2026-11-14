import React from 'react';

function KPICard({ title, value, change, comparisonValue, comparisonLabel = '전년 동기 대비', comparisonPeriodLabel = '작년 동기', format = 'text', icon: Icon }) {
    const hasComparison = typeof change === 'number'
        && Number.isFinite(change)
        && typeof comparisonValue === 'number'
        && Number.isFinite(comparisonValue)
        && comparisonValue > 0;
    const direction = !hasComparison || change === 0 ? 'unchanged' : change > 0 ? 'gain' : 'loss';
    const marker = { gain: '▲', loss: '▼', unchanged: '' }[direction];

    return (
        <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
                {Icon && <Icon size={18} />}
            </div>

            <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {value}
            </div>

            {hasComparison && (
                <div className={`text-${direction}`} style={{
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                    lineHeight: 1.4
                }}>
                    <span>
                        {comparisonLabel} {marker}{Math.abs(change)}%
                        {' '}({comparisonPeriodLabel} ₩ {comparisonValue.toLocaleString()})
                    </span>
                </div>
            )}
        </div>
    );
}

export default KPICard;
