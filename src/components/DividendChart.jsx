import React, { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, PolarArea } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import KPICard from './KPICard';
import GoalTracker from './GoalTracker';

ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

function DividendChart() {
  const [monthChart, setMonthChart] = useState(null);
  const [yearChart, setYearChart] = useState(null);
  const [accountChart, setAccountChart] = useState(null);
  const [stockChart, setStockChart] = useState(null);
  const [comparisonChart, setComparisonChart] = useState(null);
  const [kpiData, setKpiData] = useState({
    currentMonth: 0,
    currentYearTotal: 0,
    monthlyAverage: 0,
    yoyGrowth: 0
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

        const currentYearTotal = yearMap[currentYear] || 0;
        const prevYearTotal = yearMap[currentYear - 1] || 0;
        const currentMonthAmount = monthYearMap[currentYear] ? monthYearMap[currentYear][currentMonth] : 0;

        // YoY Growth calculation
        let growth = 0;
        if (prevYearTotal > 0) {
          growth = ((currentYearTotal - prevYearTotal) / prevYearTotal * 100).toFixed(1);
        }

        const monthlyAvg = currentMonth >= 0 ? Math.round(currentYearTotal / (currentMonth + 1)) : 0;

        setKpiData({
          currentMonth: currentMonthAmount,
          currentYearTotal,
          monthlyAverage: monthlyAvg,
          yoyGrowth: Number(growth)
        });

        const years = Object.keys(monthYearMap).sort();
        const palette = [
          '#4e73df', '#e74a3b', '#1cc88a', '#f6c23e', '#36b9cc', '#858796', '#fd7e14', '#6f42c1',
        ];

        setMonthChart({
          labels: MONTH_LABELS,
          datasets: years.map((year, idx) => ({
            label: year,
            data: monthYearMap[year],
            backgroundColor: palette[idx % palette.length],
            borderColor: palette[idx % palette.length],
            borderWidth: 2,
            hoverBackgroundColor: palette[idx % palette.length],
          })),
        });

        // Comparison Chart
        if (years.length > 0) {
          const currentYearData = monthYearMap[currentYear] || Array(12).fill(0);
          const prevYearData = monthYearMap[currentYear - 1] || Array(12).fill(0);
          const diffData = [];
          const comparisonLabels = [];
          const bgColors = [];
          const borderColors = [];

          for (let i = 0; i < 12; i++) {
            if (i <= currentMonth) {
              const val = currentYearData[i] - prevYearData[i];
              const label = `${currentYear} vs ${currentYear - 1}`;
              diffData.push(val);
              comparisonLabels.push(label);
              if (val >= 0) {
                bgColors.push('rgba(75, 192, 192, 0.7)');
                borderColors.push('rgb(75, 192, 192)');
              } else {
                bgColors.push('rgba(255, 99, 132, 0.7)');
                borderColors.push('rgb(255, 99, 132)');
              }
            } else {
              diffData.push(null);
              comparisonLabels.push('');
              bgColors.push('transparent');
              borderColors.push('transparent');
            }
          }

          setComparisonChart({
            labels: MONTH_LABELS,
            datasets: [{
              label: '전년 대비 증감액',
              data: diffData,
              backgroundColor: bgColors,
              borderColor: borderColors,
              borderWidth: 1,
              comparisonLabels
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
            label: '연도별 배당금 합계',
            data: years.map(y => yearMap[y]),
            backgroundColor: years.map(() => '#4e73df'),
            borderColor: years.map(() => '#4e73df'),
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
            backgroundColor: accNames.map((_, i) => palette[i % palette.length]),
            borderColor: accNames.map((_, i) => palette[i % palette.length]),
            borderWidth: 2,
          }],
        });

        // Stock Chart (Polar Area)
        let stockArr = Object.entries(stockMap);
        stockArr.sort((a, b) => b[1] - a[1]);
        stockArr = stockArr.slice(0, 10); // Limit to top 10 for Polar Area

        const colorPalette = [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(40, 159, 64, 0.7)',
          'rgba(210, 99, 132, 0.7)',
        ];

        setStockChart({
          labels: stockArr.map(([name]) => name),
          datasets: [{
            label: '종목별 배당금',
            data: stockArr.map(([, value]) => value),
            backgroundColor: colorPalette,
            borderWidth: 1,
          }]
        });

      } catch (error) {
        console.error('차트 데이터 처리 오류:', error);
      }
    };

    fetchData().catch(error => console.error('fetchData 실행 오류:', error));

    return () => { isMounted = false; };
  }, []);

  const chartOptions = (title, unit = '₩') => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#666' } },
      title: { display: true, text: title, color: '#666' },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          // Show datalabel only for current year and current month in monthly chart
          if (context.chart.config.type === 'bar' && title.includes('월별')) {
            const today = new Date();
            const isCurrentMonth = context.dataIndex === today.getMonth();
            const isCurrentYear = context.dataset.label === today.getFullYear().toString();

            if (!isCurrentMonth || !isCurrentYear) return '';
          }
          if (unit === '₩') return `₩ ${Math.round(Number(value)).toLocaleString()}`;
          return value;
        },
        font: { weight: 'bold' },
        color: '#666',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 4,
        callbacks: {
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
        ticks: { color: '#666' },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      y: {
        ticks: { color: '#666' },
        grid: { color: 'rgba(0,0,0,0.05)' }
      }
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPI Cards & Goal Tracker */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <KPICard
          title="이번 달 배당금"
          value={`₩ ${kpiData.currentMonth.toLocaleString()}`}
          icon={DollarSign}
        />
        <KPICard
          title="올해 누적 배당금"
          value={`₩ ${kpiData.currentYearTotal.toLocaleString()}`}
          change={kpiData.yoyGrowth}
          icon={TrendingUp}
        />
        <KPICard
          title="월 평균 배당금"
          value={`₩ ${kpiData.monthlyAverage.toLocaleString()}`}
          icon={Calendar}
        />
        <GoalTracker currentAmount={kpiData.monthlyAverage} />
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '320px', height: '400px' }}>
          {monthChart ? <Bar data={monthChart} options={chartOptions('월별 배당금 (연도별 비교)')} /> : <div>데이터 불러오는 중...</div>}
        </div>

        {comparisonChart && (
          <div className="card" style={{ flex: 1, minWidth: '320px', height: '400px' }}>
            <Bar data={comparisonChart} options={chartOptions(`전년 동월 대비 증감 (${comparisonChart.currentYear} vs ${comparisonChart.prevYear})`)} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '320px', height: '400px' }}>
          {yearChart ? <Bar data={yearChart} options={chartOptions('연도별 배당금 합계')} /> : <div>데이터 불러오는 중...</div>}
        </div>

        <div className="card" style={{ flex: 1, minWidth: '320px', height: '400px' }}>
          {accountChart ? <Bar data={accountChart} options={chartOptions('계좌별 배당금 합계')} /> : <div>데이터 불러오는 중...</div>}
        </div>
      </div>

      <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#666' }}>종목별 배당금 (Top 10)</h4>
        <div style={{ flex: 1, width: '100%', maxWidth: '500px', position: 'relative' }}>
          {stockChart ? (
            <PolarArea data={stockChart} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'right', labels: { color: '#666' } },
                datalabels: { display: false },
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
                r: {
                  ticks: { display: false }, // Hide radial ticks for cleaner look
                  grid: { color: 'rgba(0,0,0,0.05)' }
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
