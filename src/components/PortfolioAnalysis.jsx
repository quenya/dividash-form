import React, { useMemo, useState, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useDividendData } from '../hooks/useDividendData';
import { PieChart, PlusCircle, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../api/supabaseClient';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function PortfolioAnalysis() {
    const { data, tickersMap, exchangeRate, loading, refetch } = useDividendData();

    const [registeringTicker, setRegisteringTicker] = useState(null);
    const [newSector, setNewSector] = useState('ETF');
    const [newIndustry, setNewIndustry] = useState('Multi-Sector');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenModal = (ticker) => {
        setRegisteringTicker(ticker);
        setNewSector('ETF');
        setNewIndustry('Multi-Sector');
    };

    const handleCloseModal = () => {
        setRegisteringTicker(null);
    };

    const handleRegister = async () => {
        if (!registeringTicker || !newSector || !newIndustry) return;

        setIsSubmitting(true);
        // Normalize the ticker being registered
        const tickerToRegister = registeringTicker.trim();

        try {
            console.log('Registering to DB:', { ticker: tickerToRegister, sector: newSector, industry: newIndustry });

            const { error } = await supabase
                .from('tickers')
                .insert([{
                    ticker: tickerToRegister,
                    sector: newSector.trim(),
                    industry: newIndustry.trim()
                }]);

            if (error) {
                if (error.code === '23505') {
                    alert('이미 등록된 종목입니다.');
                } else {
                    throw error;
                }
            } else {
                alert(`'${tickerToRegister}' 종목이 성공적으로 등록되었습니다!`);
                // Close modal first
                setRegisteringTicker(null);

                // CRITICAL: Delay refetch slightly or ensure it's called
                console.log('Calling refetch...');
                if (refetch) {
                    await refetch();
                    console.log('Refetch complete.');
                }
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('등록 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const { sectorChartData, sectorTableData, unknownItems } = useMemo(() => {
        const sectorMap = {};
        const tickerAgg = {};

        // Debug log to see what's being mapped
        console.log('Recalculating weights with tickersMap:', Object.keys(tickersMap).length, 'items');

        data.forEach(item => {
            let amount = Number(item.dividend_amount) || 0;
            if (item.currency === 'USD') amount = amount * exchangeRate;

            let rawTicker = item.ticker || '';
            let rawCompany = item.company_name || '';

            // Normalize for lookup
            let lookupKey = rawTicker.toUpperCase().trim();
            if (!lookupKey && rawCompany) {
                lookupKey = rawCompany.toUpperCase().trim();
            }

            const ticker = lookupKey || 'UNKNOWN';
            if (!tickerAgg[ticker]) tickerAgg[ticker] = 0;
            tickerAgg[ticker] += amount;
        });

        Object.entries(tickerAgg).forEach(([ticker, amount]) => {
            let sector = 'Unknown';
            const normalizedTicker = ticker.toUpperCase().trim();

            if (tickersMap[normalizedTicker]) {
                sector = tickersMap[normalizedTicker].sector || 'Unknown';
            }

            if (!sectorMap[sector]) sectorMap[sector] = 0;
            sectorMap[sector] += amount;
        });

        const categories = Object.keys(sectorMap).sort((a, b) => sectorMap[b] - sectorMap[a]);
        const values = categories.map(c => sectorMap[c]);

        const tableData = Object.entries(tickerAgg)
            .map(([ticker, amount]) => {
                const normalizedTicker = ticker.toUpperCase().trim();
                const metadata = tickersMap[normalizedTicker];
                return {
                    ticker,
                    amount,
                    sector: metadata?.sector || 'Unknown',
                    industry: metadata?.industry || '-'
                };
            })
            .sort((a, b) => b.amount - a.amount);

        const unknown = tableData.filter(row => row.sector === 'Unknown');

        return {
            sectorChartData: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#8e44ad', '#34495e', '#2ecc71', '#e74c3c', '#95a5a6', '#7f8c8d'
                    ],
                    borderWidth: 1,
                }]
            },
            sectorTableData: tableData,
            unknownItems: unknown
        };
    }, [data, tickersMap, exchangeRate]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>데이터 로딩 중...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', position: 'relative' }}>

            {/* Modal */}
            {registeringTicker && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>종목 정보 등록</h3>
                            <button onClick={handleCloseModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#666' }}>등록할 종목명</label>
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{registeringTicker}</div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px' }}>섹터</label>
                            <input
                                type="text" value={newSector} onChange={e => setNewSector(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px' }}>산업군</label>
                            <input
                                type="text" value={newIndustry} onChange={e => setNewIndustry(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleCloseModal} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleRegister} disabled={isSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-color)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                                {isSubmitting ? '처리 중...' : '등록 완료'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sector Chart */}
            <div className="card" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ flex: '0 0 auto', width: '100%', maxWidth: '380px', height: '240px', position: 'relative' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '10px' }}>섹터별 배당 비중</h4>
                    <Doughnut
                        data={sectorChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            const label = context.label || '';
                                            const value = context.raw;
                                            return ` ${label}: ₩${Math.round(value).toLocaleString()}`;
                                        }
                                    }
                                },
                                datalabels: {
                                    color: '#fff',
                                    formatter: (value, ctx) => {
                                        const dataset = ctx.chart.data.datasets[0];
                                        const total = dataset.data.reduce((acc, curr) => acc + curr, 0);
                                        return ((value / total) * 100).toFixed(1) + '%';
                                    }
                                }
                            }
                        }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '250px', padding: '16px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieChart size={18} /> 포트폴리오 분석</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>상위 기여 종목들의 섹터 분포를 확인하세요.</p>
                </div>
            </div>

            {/* Top 20 Table */}
            <div className="card">
                <h4>종목별 기여도 Top 20</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '12px' }}>종목</th>
                                <th style={{ padding: '12px' }}>섹터</th>
                                <th style={{ padding: '12px' }}>산업</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>누적 배당금</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>비중</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sectorTableData.slice(0, 20).map((row, idx) => {
                                const total = sectorTableData.reduce((sum, r) => sum + r.amount, 0);
                                const percent = ((row.amount / total) * 100).toFixed(1);
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.ticker}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px',
                                                backgroundColor: row.sector === 'Unknown' ? 'rgba(231, 74, 59, 0.1)' : 'rgba(0,0,0,0.05)',
                                                color: row.sector === 'Unknown' ? '#e74a3b' : 'inherit'
                                            }}>
                                                {row.sector}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{row.industry}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>₩ {Math.round(row.amount).toLocaleString()}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{percent}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Unknown Action Table */}
            {unknownItems.length > 0 && (
                <div className="card" style={{ border: '1px solid #e74a3b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <AlertCircle color="#e74a3b" size={20} />
                        <h4 style={{ margin: 0, color: '#e74a3b' }}>분류 미확인 종목 정보 보완</h4>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>종목명(티커)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>누적 배당금</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>조치</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unknownItems.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.ticker}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>₩ {Math.round(row.amount).toLocaleString()}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(row.ticker)}
                                                style={{
                                                    padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#e74a3b', color: '#fff',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                                }}
                                            >
                                                정보 입력
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PortfolioAnalysis;
