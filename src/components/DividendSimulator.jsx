import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TrendingUp, Calculator, RefreshCw, Loader2, Save } from 'lucide-react';
import { useDividendData } from '../hooks/useDividendData';
import { supabase } from '../api/supabaseClient';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
);

function DividendSimulator() {
    const { data, exchangeRate, loading: dataLoading } = useDividendData();

    // Simulation Inputs (Initial values are defaults)
    const [monthlyAddition, setMonthlyAddition] = useState(1000000);
    const [expectedYield, setExpectedYield] = useState(4.0);
    const [dividendGrowth, setDividendGrowth] = useState(5.0);
    const [reinvest, setReinvest] = useState(true);

    const [settingsLoading, setSettingsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch settings from Supabase
    const fetchSettings = useCallback(async () => {
        setSettingsLoading(true);
        try {
            const { data: settings, error } = await supabase
                .from('simulation_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') console.error('Error fetching settings:', error);
            } else if (settings) {
                setMonthlyAddition(Number(settings.monthly_addition));
                setExpectedYield(Number(settings.expected_yield));
                setDividendGrowth(Number(settings.dividend_growth));
                setReinvest(settings.reinvest);
            }
        } catch (err) {
            console.error('Fetch settings error:', err);
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('simulation_settings')
                .upsert({
                    id: 1,
                    monthly_addition: monthlyAddition,
                    expected_yield: expectedYield,
                    dividend_growth: dividendGrowth,
                    reinvest: reinvest,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            alert('시뮬레이션 설정이 저장되었습니다.');
        } catch (err) {
            console.error('Save settings error:', err);
            alert('설정 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate Initial Annual Dividend from current data
    const initialAnnualDividend = useMemo(() => {
        if (!data || data.length === 0) return 0;

        const currentYear = new Date().getFullYear();
        let totalCurrentYear = 0;

        data.forEach(item => {
            const itemDate = new Date(item.payment_date);
            if (itemDate.getFullYear() === currentYear) {
                let amt = Number(item.dividend_amount) || 0;
                if (item.currency === 'USD') amt *= exchangeRate;
                totalCurrentYear += amt;
            }
        });

        if (totalCurrentYear > 0) {
            const elapsedMonths = new Date().getMonth() + 1;
            return (totalCurrentYear / elapsedMonths) * 12;
        }

        let totalAll = 0;
        data.forEach(item => {
            let amt = Number(item.dividend_amount) || 0;
            if (item.currency === 'USD') amt *= exchangeRate;
            totalAll += amt;
        });
        const firstDate = new Date(data[data.length - 1].payment_date);
        const lastDate = new Date(data[0].payment_date);
        const monthDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1;

        return monthDiff > 0 ? (totalAll / monthDiff) * 12 : totalAll;
    }, [data, exchangeRate]);

    // Simulation Logic
    const simulationData = useMemo(() => {
        const months = 120; // 10 years
        const monthlyData = [];
        const labels = [];

        let currentAnnualDividend = initialAnnualDividend || 0;

        for (let m = 1; m <= months; m++) {
            if (m > 1 && m % 12 === 1) {
                currentAnnualDividend *= (1 + (dividendGrowth / 100));
            }

            const additionalAnnualDividend = monthlyAddition * (expectedYield / 100);
            currentAnnualDividend += additionalAnnualDividend;

            if (reinvest) {
                const monthlyPayout = currentAnnualDividend / 12;
                const reinvestedAnnualDividend = monthlyPayout * (expectedYield / 100);
                currentAnnualDividend += reinvestedAnnualDividend;
            }

            if (m % 12 === 0 || m === 1) {
                labels.push(`${Math.floor(m / 12)}년차`);
                monthlyData.push(Math.round(currentAnnualDividend / 12));
            }
        }

        return {
            labels,
            datasets: [
                {
                    fill: true,
                    label: '예상 월 배당금',
                    data: monthlyData,
                    borderColor: 'var(--accent-color)',
                    backgroundColor: 'rgba(78, 115, 223, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'var(--accent-color)',
                },
            ],
        };
    }, [initialAnnualDividend, monthlyAddition, expectedYield, dividendGrowth, reinvest]);

    const finalMonthlyDividend = simulationData.datasets[0].data[simulationData.datasets[0].data.length - 1];

    if (dataLoading || settingsLoading) return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={24} color="var(--accent-color)" />
                        <h3 style={{ margin: 0 }}>10년 배당 성장 시뮬레이터</h3>
                    </div>
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '10px',
                            backgroundColor: 'var(--accent-color)', color: '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        설정 저장
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                    {/* Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>월 추가 투자금</label>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>₩ {(monthlyAddition / 10000).toLocaleString()}만원</span>
                            </div>
                            <input
                                type="range" min="0" max="10000000" step="50000"
                                value={monthlyAddition} onChange={(e) => setMonthlyAddition(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>신규 투자 배당 수익률</label>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{expectedYield}%</span>
                            </div>
                            <input
                                type="range" min="0" max="15" step="0.1"
                                value={expectedYield} onChange={(e) => setExpectedYield(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>연간 배당 성장률 (YoY)</label>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{dividendGrowth}%</span>
                            </div>
                            <input
                                type="range" min="0" max="25" step="0.5"
                                value={dividendGrowth} onChange={(e) => setDividendGrowth(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>

                        <button
                            onClick={() => setReinvest(!reinvest)}
                            style={{
                                padding: '12px', borderRadius: '12px', border: 'none',
                                backgroundColor: reinvest ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                color: reinvest ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            <RefreshCw size={18} />
                            배당금 재투자 {reinvest ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Result Card */}
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
                            <Calculator size={100} color="var(--accent-color)" />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>10년 뒤 예상 월 배당금</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '16px' }}>
                            ₩ {finalMonthlyDividend.toLocaleString()}
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            현재 월평균 배당 ₩ {Math.round((initialAnnualDividend || 0) / 12).toLocaleString()} 대비 <br />
                            약 <strong style={{ color: 'var(--text-primary)' }}>{(finalMonthlyDividend / Math.max(1, (initialAnnualDividend / 12))).toFixed(1)}배</strong> 성장이 기대됩니다.
                        </div>
                    </div>
                </div>

                {/* Chart View */}
                <div style={{ height: '350px', marginTop: '48px' }}>
                    <Line
                        data={simulationData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        label: (context) => ` 예상 월 배당: ₩ ${context.raw.toLocaleString()}`
                                    }
                                },
                                datalabels: {
                                    anchor: 'end',
                                    align: 'top',
                                    offset: 8,
                                    font: { size: 10, weight: 'bold' },
                                    color: 'var(--text-secondary)',
                                    formatter: (value) => `₩${(value / 10000).toFixed(0)}만`,
                                    padding: 4
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: { color: 'rgba(0,0,0,0.05)' },
                                    ticks: { callback: (value) => `₩ ${(value / 10000).toLocaleString()}만` }
                                },
                                x: { grid: { display: false } }
                            },
                            interaction: { mode: 'index', intersect: false }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default DividendSimulator;
