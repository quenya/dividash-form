import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import KPICard from './KPICard';
import GoalTracker from './GoalTracker';
import { calculateYtdKpi } from '../utils/dividendKpi';
import { getChartColor } from '../utils/chartPalette';
import { useChartTheme } from '../context/ThemeContext';
import {
  buildMonthlyYearDatasets,
  buildYoyComparison,
  formatKrwAxis,
  formatKrwLabel,
  IN_PROGRESS_SUFFIX,
  periodFill,
} from '../utils/dividendChartData';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineController, LineElement, PointElement, Title, Tooltip, Legend, ChartDataLabels);

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];
const YEAR_CHART_TITLE = '연도별 배당금 합계';

function DividendChart() {
  const chartTheme = useChartTheme();
  const [monthChart, setMonthChart] = useState(null);
  const [yearChart, setYearChart] = useState(null);
  const [accountChart, setAccountChart] = useState(null);
  const [stockChart, setStockChart] = useState(null);
  const [comparisonChart, setComparisonChart] = useState(null);
  const [hiddenYearIndexes, setHiddenYearIndexes] = useState([]);
  const yearChartRef = useRef(null);
  const [kpiData, setKpiData] = useState({
    currentMonth: 0,
    currentYearTotal: 0,
    previousYearTotal: null,
    monthlyAverage: 0,
    previousMonthlyAverage: null,
    yoyGrowth: null,
    monthlyAverageYoyGrowth: null
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      let USD_KRW = 1300;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.rates && json.rates.KRW) {
          USD_KRW = json.rates.KRW;
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('환율 API 호출 실패, 기본값 사용:', e.message);
        }
      }

      if (!isMounted) return;
      try {
        const { data, error } = await supabase
          .from('dividend_entries')
          .select('dividend_amount, payment_date, currency, account_name, ticker, company_name');

        if (error) {
          console.error('Supabase 데이터 조회 오류:', error);
          return;
        }

        if (!isMounted) return;

        const monthYearMap = {};
        const yearMap = {};
        const accountMap = {};
        const stockMap = {};

        (data || []).forEach(item => {
          if (!item.payment_date) return;
          const [year, month] = item.payment_date.split('-');
          let amount = Number(item.dividend_amount) || 0;
          if (item.currency === 'USD') amount = amount * USD_KRW;
          amount = Math.round(amount);

          if (!monthYearMap[year]) monthYearMap[year] = Array(12).fill(0);
          monthYearMap[year][parseInt(month, 10) - 1] += amount;

          if (!yearMap[year]) yearMap[year] = 0;
          yearMap[year] += amount;

          const acc = (item.account_name || '').trim();
          if (acc) {
            if (!accountMap[acc]) accountMap[acc] = 0;
            accountMap[acc] += amount;
          }

          const stock = (item.company_name || item.ticker || '').trim();
          if (stock) {
            if (!stockMap[stock]) stockMap[stock] = 0;
            stockMap[stock] += amount;
          }
        });

        // KPI Calculation
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed

        const currentMonthAmount = monthYearMap[currentYear] ? monthYearMap[currentYear][currentMonth] : 0;
        const {
          currentYearTotal,
          previousYearTotal,
          yoyGrowth,
          previousMonthlyAverage,
          monthlyAverageYoyGrowth,
          previousMonthAmount,
          monthlyYoyGrowth,
          monthlyAverage: monthlyAvg,
        } = calculateYtdKpi(monthYearMap, currentYear, currentMonth);

        setKpiData({
          currentMonth: currentMonthAmount,
          currentYearTotal,
          previousYearTotal,
          monthlyAverage: monthlyAvg,
          previousMonthlyAverage,
          monthlyAverageYoyGrowth,
          yoyGrowth,
          previousMonthAmount,
          monthlyYoyGrowth
        });

        const years = Object.keys(monthYearMap).sort();

        setMonthChart({
          labels: MONTH_LABELS,
          datasets: buildMonthlyYearDatasets(monthYearMap, years, currentYear, currentMonth, getChartColor),
        });

        // Comparison Chart
        if (years.length > 0) {
          const comparison = buildYoyComparison(monthYearMap, currentYear, currentMonth);

          setComparisonChart({
            labels: MONTH_LABELS,
            datasets: [{
              label: '전년 대비 증감액',
              data: comparison.data,
              backgroundColor: comparison.backgroundColor,
              borderColor: comparison.borderColor,
              borderWidth: 1,
            }],
            currentYear,
            prevYear: currentYear - 1
          });
        } else {
          setComparisonChart(null);
        }

        // Year Chart
        setYearChart({
          labels: years,
          datasets: [{
            label: YEAR_CHART_TITLE,
            data: years.map(y => yearMap[y]),
            backgroundColor: years.map((year, idx) => periodFill(getChartColor(idx), Number(year) === currentYear)),
            borderColor: years.map((_, idx) => getChartColor(idx)),
            borderWidth: 2,
          }],
        });

        // Account Chart
        let accArr = Object.entries(accountMap);
        accArr.sort((a, b) => b[1] - a[1]);
        const accNames = accArr.map(([name]) => name);
        const accValues = accArr.map(([_, value]) => value);

        setAccountChart({
          labels: accNames,
          datasets: [{
            label: '계좌별 배당금 합계',
            data: accValues,
            backgroundColor: accNames.map((_, i) => getChartColor(i)),
            borderColor: accNames.map((_, i) => getChartColor(i)),
            borderWidth: 2,
          }],
        });

        let stockArr = Object.entries(stockMap);
        stockArr.sort((a, b) => b[1] - a[1]);
        stockArr = stockArr.slice(0, 10);

        setStockChart({
          labels: stockArr.map(([name]) => name),
          datasets: [{
            label: '종목별 배당금',
            data: stockArr.map(([, value]) => value),
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 22,
          }]
        });

      } catch (error) {
        console.error('차트 데이터 처리 오류:', error);
      }
    };

    fetchData().catch(error => console.error('fetchData 실행 오류:', error));

    return () => { isMounted = false; };
  }, []);

  const today = new Date();
  const currentYearLabel = String(today.getFullYear());
  const currentMonthIndex = today.getMonth();

  const chartOptions = (title, unit = '₩', {
    showLegend = true,
    isInProgress = () => false,
    showLabel = () => true,
    interaction,
  } = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction,
    layout: {
      padding: {
        top: 8,
        right: 8,
        bottom: 4,
        left: 4
      }
    },
    plugins: {
      legend: showLegend ? { position: 'top', labels: { color: chartTheme.text } } : { display: false },
      title: { display: true, text: title, color: chartTheme.text },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          if (!showLabel(context)) return '';
          if (unit === '₩') return formatKrwLabel(value);
          return value;
        },
        font: { weight: 'bold' },
        color: chartTheme.text,
      },
      tooltip: {
        yAlign: title.includes('전년 동월') ? 'bottom' : undefined,
        backgroundColor: chartTheme.tooltipBg,
        titleColor: chartTheme.tooltipText,
        bodyColor: chartTheme.tooltipText,
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          title: (items) => {
            const label = items[0]?.label || '';
            const suffix = items.some(isInProgress) ? IN_PROGRESS_SUFFIX : '';
            return `${title === YEAR_CHART_TITLE ? `${label}년` : label}${suffix}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            if (value === null || value === undefined) return '';
            return ` ${label}: ${unit} ${Math.round(value).toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: chartTheme.text },
        grid: { color: chartTheme.grid }
      },
      y: {
        grace: title.includes('전년 동월') ? '20%' : undefined,
        ticks: { color: chartTheme.text, callback: (value) => formatKrwAxis(value) },
        grid: { color: chartTheme.grid }
      }
    }
  });

  const yearChartOptions = () => {
    const options = chartOptions(YEAR_CHART_TITLE, '₩', {
      isInProgress: (item) => item.label === currentYearLabel,
    });

    options.layout.padding.top = 24;
    options.plugins.legend = {
      display: false,
    };

    return options;
  };

  const toggleYearVisibility = (index) => {
    const chart = yearChartRef.current;
    if (!chart) return;

    chart.toggleDataVisibility(index);
    chart.update();
    setHiddenYearIndexes((currentIndexes) => (
      currentIndexes.includes(index)
        ? currentIndexes.filter((currentIndex) => currentIndex !== index)
        : [...currentIndexes, index]
    ));
  };

  const currentMonthNumber = currentMonthIndex + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPI Cards & Goal Tracker */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <KPICard
          title="이번 달 배당금"
          value={`₩ ${kpiData.currentMonth.toLocaleString()}`}
          change={kpiData.monthlyYoyGrowth}
          comparisonValue={kpiData.previousMonthAmount}
          comparisonLabel="작년 동월 대비"
          comparisonPeriodLabel="작년 동월"
          icon={DollarSign}
        />
        <KPICard
          title="올해 누적 배당금"
          value={`₩ ${kpiData.currentYearTotal.toLocaleString()}`}
          change={kpiData.yoyGrowth}
          comparisonValue={kpiData.previousYearTotal}
          icon={TrendingUp}
        />
        <KPICard
          title={`월 평균 배당금 (올해 1~${currentMonthNumber}월)`}
          value={`₩ ${kpiData.monthlyAverage.toLocaleString()}`}
          change={kpiData.monthlyAverageYoyGrowth}
          comparisonValue={kpiData.previousMonthlyAverage}
          comparisonLabel="전년 동기 대비"
          comparisonPeriodLabel={`작년 1~${currentMonthNumber}월 평균`}
          icon={Calendar}
        />
        <GoalTracker currentAmount={kpiData.monthlyAverage} />
      </div>

      <p style={{ margin: '-8px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        흐린 막대는 아직 끝나지 않은 기간(이번 달, 올해)입니다.
      </p>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 'min(320px, 100%)', height: '400px' }}>
          {monthChart ? <Bar data={monthChart} options={chartOptions('월별 배당금 (연도별 비교)', '₩', {
            interaction: { mode: 'index', intersect: false },
            isInProgress: (item) => item.dataset.label === currentYearLabel && item.dataIndex === currentMonthIndex,
            showLabel: (context) => context.dataset.label === currentYearLabel && context.dataIndex === currentMonthIndex,
          })} /> : <div>데이터 불러오는 중...</div>}
        </div>

        {comparisonChart && (
          <div className="card" style={{ flex: 1, minWidth: 'min(320px, 100%)', height: '400px' }}>
            <Bar data={comparisonChart} options={chartOptions(`전년 동월 대비 증감 (${comparisonChart.currentYear} vs ${comparisonChart.prevYear})`, '₩', {
              showLegend: false,
              isInProgress: (item) => item.dataIndex === currentMonthIndex,
              showLabel: (context) => context.dataIndex === currentMonthIndex,
            })} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 'min(320px, 100%)', height: '400px' }}>
          {yearChart ? (
            <>
              <Bar
                ref={yearChartRef}
                data={yearChart}
                options={yearChartOptions()}
                aria-label="연도별 배당금 합계 차트. 막대와 범례의 색상으로 연도를 구분합니다."
                fallbackContent="연도별 배당금 합계 차트"
              />
              <div
                role="list"
                aria-label="연도별 배당금 색상 범례"
                style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px', paddingTop: 4 }}
              >
                {yearChart.labels.map((year, index) => {
                  const isHidden = hiddenYearIndexes.includes(index);

                  return (
                    <div key={year} role="listitem">
                      <button
                        type="button"
                        aria-pressed={!isHidden}
                        aria-label={`${year}년 배당금 ${isHidden ? '표시' : '숨김'}`}
                        onClick={() => toggleYearVisibility(index)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, border: 0, background: 'transparent', color: 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        <span aria-hidden="true" style={{ width: 28, height: 14, backgroundColor: getChartColor(index), opacity: isHidden ? 0.35 : 1 }} />
                        {year}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <div>데이터 불러오는 중...</div>}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 'min(320px, 100%)', height: '400px' }}>
          {accountChart ? <Bar data={accountChart} options={chartOptions('계좌별 배당금 합계', '₩', { showLegend: false })} /> : <div>데이터 불러오는 중...</div>}
        </div>
      </div>

      <div className="card" style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>종목별 배당금 (Top 10)</h4>
        <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
          {stockChart ? (
            <Bar data={{
              ...stockChart,
              datasets: stockChart.datasets.map((dataset) => ({
                ...dataset,
                backgroundColor: chartTheme.accent,
                borderColor: chartTheme.accent,
              })),
            }} options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              layout: {
                padding: {
                  top: 8,
                  right: 64,
                  bottom: 4,
                  left: 4
                }
              },
              plugins: {
                legend: { display: false },
                datalabels: {
                  anchor: 'end',
                  align: 'right',
                  clamp: true,
                  color: chartTheme.text,
                  formatter: (value) => `₩${Math.round(value).toLocaleString()}`,
                  font: { weight: 'bold', size: 11 }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const val = context.raw;
                      return ` ${context.label}: ₩${Math.round(val).toLocaleString()}`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: chartTheme.text,
                    callback: (value) => formatKrwAxis(value)
                  },
                  grid: { color: chartTheme.grid }
                },
                y: {
                  ticks: {
                    color: chartTheme.text,
                    callback: function(value) {
                      const label = this.getLabelForValue(value);
                      return label.length > 20 ? `${label.slice(0, 20)}...` : label;
                    }
                  },
                  grid: { display: false }
                }
              }
            }} />
          ) : <div>데이터 불러오는 중...</div>}
        </div>
      </div>

    </div>
  );
}

export default DividendChart;
