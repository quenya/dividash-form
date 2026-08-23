import React, { useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useDividendData } from '../hooks/useDividendData';
import { buildPortfolioSummary, getPortfolioDisplayName, MATCH_STATUS } from '../utils/tickerMatching';
import { PieChart, AlertCircle, X } from 'lucide-react';
import { supabase } from '../api/supabaseClient';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function PortfolioAnalysis() {
    const { data, tickersMap, tickerMatchesMap, exchangeRate, loading, refetch } = useDividendData();

    const [registeringRow, setRegisteringRow] = useState(null);
    const [matchStatus, setMatchStatus] = useState(MATCH_STATUS.MANUAL_REVIEW);
    const [confidence, setConfidence] = useState('low');
    const [matchedTicker, setMatchedTicker] = useState('');
    const [matchedCompanyName, setMatchedCompanyName] = useState('');
    const [market, setMarket] = useState('');
    const [newSector, setNewSector] = useState('');
    const [newIndustry, setNewIndustry] = useState('');
    const [evidence, setEvidence] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenModal = (row) => {
        const match = row.match || {};
        setRegisteringRow(row);
        setMatchStatus(match.status || MATCH_STATUS.MANUAL_REVIEW);
        setConfidence(match.confidence || 'low');
        setMatchedTicker(match.matched_ticker || '');
        setMatchedCompanyName(match.matched_company_name || '');
        setMarket(match.market || '');
        setNewSector(match.sector || '');
        setNewIndustry(match.industry || '');
        setEvidence(match.evidence || '');
    };

    const handleCloseModal = () => {
        setRegisteringRow(null);
    };

    const handleRegister = async () => {
        if (!registeringRow || !evidence.trim()) return;

        const sourceInput = registeringRow.sourceInput.trim();
        const normalizedTicker = matchedTicker.trim().toUpperCase();
        if (matchStatus === MATCH_STATUS.CONFIRMED) {
            alert('확정 매칭은 검증된 migration에서만 등록할 수 있습니다.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('ticker_matches')
                .upsert([{
                    source_input: sourceInput.toUpperCase(),
                    matched_ticker: normalizedTicker || null,
                    matched_company_name: matchedCompanyName.trim() || null,
                    market: market.trim() || null,
                    sector: newSector.trim() || null,
                    industry: newIndustry.trim() || null,
                    status: matchStatus,
                    confidence,
                    evidence: evidence.trim(),
                    updated_at: new Date().toISOString()
                }], { onConflict: 'source_input' });

            if (error) {
                throw error;
            } else {
                alert(matchStatus === MATCH_STATUS.UNMATCHED ? '미매칭 보류로 저장되었습니다.' : '수동 확인 대상으로 저장되었습니다.');
                setRegisteringRow(null);
                await refetch();
            }
        } catch (err) {
            console.error('종목 매칭 저장 오류:', err);
            alert('종목 매칭 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const { sectorChartData, sectorTableData, unknownItems } = useMemo(() => {
        const summary = buildPortfolioSummary({
            data,
            exchangeRate,
            tickerMatchesMap: tickerMatchesMap || {},
            tickersMap
        });
        return {
            sectorChartData: {
                labels: summary.sectorChartData.labels,
                datasets: [{
                    data: summary.sectorChartData.values,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#8e44ad', '#34495e', '#2ecc71', '#e74c3c', '#95a5a6', '#7f8c8d'
                    ],
                    borderWidth: 1,
                }]
            },
            sectorTableData: summary.sectorTableData,
            unknownItems: summary.unknownItems
        };
    }, [data, tickerMatchesMap, tickersMap, exchangeRate]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>데이터 로딩 중...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', position: 'relative' }}>

            {/* Modal */}
            {registeringRow && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>종목 매칭 정보 확인</h3>
                            <button onClick={handleCloseModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#666' }}>원본 입력값</label>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{registeringRow.sourceInput}</div>
                            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>검증된 확정 매칭만 분류와 배당 집계에 반영됩니다. 이 화면에서는 수동 확인 결과만 저장합니다.</p>
                        </div>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            처리 상태
                            <select value={matchStatus} onChange={e => setMatchStatus(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }}>
                                <option value={MATCH_STATUS.MANUAL_REVIEW}>수동 확인</option>
                                <option value={MATCH_STATUS.UNMATCHED}>미매칭 보류</option>
                            </select>
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            신뢰 수준
                            <select value={confidence} onChange={e => setConfidence(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }}>
                                <option value="high">높음</option>
                                <option value="medium">중간</option>
                                <option value="low">낮음</option>
                            </select>
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            실제 종목명
                            <input type="text" value={matchedCompanyName} onChange={e => setMatchedCompanyName(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            실제 티커
                            <input type="text" value={matchedTicker} onChange={e => setMatchedTicker(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            시장
                            <input type="text" value={market} onChange={e => setMarket(e.target.value)} placeholder="예: NASDAQ, KOSPI" style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            섹터
                            <input type="text" value={newSector} onChange={e => setNewSector(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '12px' }}>
                            산업군
                            <input type="text" value={newIndustry} onChange={e => setNewIndustry(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '24px' }}>
                            매칭 근거
                            <textarea value={evidence} onChange={e => setEvidence(e.target.value)} required rows={3} placeholder="공식 거래소·발행사·공시 등 확인 가능한 근거를 기록하세요." style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px', resize: 'vertical' }} />
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleCloseModal} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleRegister} disabled={isSubmitting || !evidence.trim()} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-color)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                                {isSubmitting ? '처리 중...' : '매칭 정보 저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sector Chart */}
            <div className="card" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ flex: '0 1 520px', width: '100%', minWidth: 'min(320px, 100%)' }}>
                    <h4 style={{ textAlign: 'center', margin: '0 0 16px 0' }}>섹터별 배당 비중</h4>
                    <div style={{ width: '100%', height: '360px', position: 'relative' }}>
                        <Doughnut
                            data={sectorChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: {
                                    padding: {
                                        top: 12,
                                        right: 16,
                                        bottom: 12,
                                        left: 16
                                    }
                                },
                                plugins: {
                                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, color: '#666' } },
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
                </div>
                <div style={{ flex: 1, minWidth: '250px', padding: '16px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieChart size={18} /> 포트폴리오 분석</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>상위 기여 종목들의 섹터 분포를 확인하세요.</p>
                </div>
            </div>

            {/* Top 20 Table */}
            <div className="card">
                <h4>종목별 기여도 Top 20</h4>
                <div className="portfolio-table-scroll" style={{ overflowX: 'auto' }}>
                    <table className="portfolio-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
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
                                const displayName = getPortfolioDisplayName(row);
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td className="portfolio-security-cell" style={{ padding: '12px', fontWeight: 'bold' }}>
                                            <span className="portfolio-security-name">{displayName}</span>
                                        </td>
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
                    <div className="portfolio-table-scroll" style={{ overflowX: 'auto' }}>
                        <table className="portfolio-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>원본 입력값</th>
                                    <th style={{ padding: '12px' }}>확인 후보</th>
                                    <th style={{ padding: '12px' }}>상태</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>누적 배당금</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>조치</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unknownItems.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.sourceInput || row.ticker}</td>
                                        <td style={{ padding: '12px' }}>{row.match?.matched_company_name || '-'}{row.match?.matched_ticker ? ` (${row.match.matched_ticker})` : ''}</td>
                                        <td style={{ padding: '12px' }}>{row.matchStatus === MATCH_STATUS.MANUAL_REVIEW ? '수동 확인' : row.matchStatus === MATCH_STATUS.UNMATCHED ? '미매칭 보류' : '미확인'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>₩ {Math.round(row.amount).toLocaleString()}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(row)}
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
