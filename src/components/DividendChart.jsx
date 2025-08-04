import React, { useEffect, useState } from 'react';
import DividendPredictionChart from './DividendPredictionChart';
import { supabase } from '../api/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

function DividendChart() {
  const [monthChart, setMonthChart] = useState(null);
  const [yearChart, setYearChart] = useState(null);
  const [accountChart, setAccountChart] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // 실시간 환율 fetch
      let USD_KRW = 1300;
      try {
        const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.rates && json.rates.KRW) {
          USD_KRW = json.rates.KRW;
        }
      } catch (e) {
        // 환율 fetch 실패 시 기본값 사용
      }
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('dividend_amount, payment_date, currency, account_name');
      if (error) return;
      // 월별 연도별 집계
      const monthYearMap = {};
      const yearMap = {};
      const accountMap = {};
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
      });
      // 월별 차트 데이터
      const years = Object.keys(monthYearMap).sort();
      const palette = [
        '#4e73df', '#e74a3b', '#1cc88a', '#f6c23e', '#36b9cc', '#858796', '#fd7e14', '#6f42c1',
      ];
      const monthDatasets = years.map((year, idx) => ({
        label: year,
        data: monthYearMap[year],
        backgroundColor: palette[idx % palette.length],
        borderColor: palette[idx % palette.length],
        borderWidth: 2,
        hoverBackgroundColor: palette[idx % palette.length],
      }));
      setMonthChart({
        labels: MONTH_LABELS,
        datasets: monthDatasets,
      });
      // 연도별 차트 데이터
      setYearChart({
        labels: years,
        datasets: [
          {
            label: '연도별 배당금 합계',
            data: years.map(y => yearMap[y]),
            backgroundColor: years.map(() => '#4e73df'),
            borderColor: years.map(() => '#4e73df'),
            borderWidth: 2,
          },
        ],
      });
      // 계좌별 차트 데이터
      let accArr = Object.entries(accountMap);
      accArr.sort((a, b) => b[1] - a[1]);
      const accNames = accArr.map(([name]) => name);
      const accValues = accArr.map(([_, value]) => value);
      const accPalette = [
        '#4e73df', '#e74a3b', '#1cc88a', '#f6c23e', '#36b9cc', '#858796', '#fd7e14', '#6f42c1',
      ];
      setAccountChart({
        labels: accNames,
        datasets: [
          {
            label: '계좌별 배당금 합계',
            data: accValues,
            backgroundColor: accNames.map((_, i) => accPalette[i % accPalette.length]),
            borderColor: accNames.map((_, i) => accPalette[i % accPalette.length]),
            borderWidth: 2,
          },
        ],
      });
    };
    fetchData();
  }, []);

  return (
    <div style={{ marginTop: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 320 }}>
        <h4>월별 배당금 (연도별 비교)</h4>
        {monthChart ? (
          <Bar
            data={monthChart}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '월별 배당금 (연도별 비교)' },
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: ctx => {
                      const year = ctx.dataset.label;
                      const amount = `₩ ${Math.round(Number(ctx.parsed.y)).toLocaleString()}`;
                      return `${year}: ${amount}`;
                    },
                  },
                },
                datalabels: {
                  display: ctx => {
                    const currentYear = new Date().getFullYear().toString();
                    const currentMonthIdx = new Date().getMonth();
                    return ctx.dataset.label === currentYear && ctx.dataIndex === currentMonthIdx;
                  },
                  formatter: value => `₩ ${Math.round(Number(value)).toLocaleString()}`,
                  anchor: 'end',
                  align: 'top',
                  font: { weight: 'bold' },
                  color: '#333',
                },
              },
              scales: {
                x: { title: { display: true, text: '월' } },
                y: {
                  title: { display: true, text: '배당금 합계 (₩)' },
                  ticks: {
                    callback: value => `₩ ${Number(value).toLocaleString()}`,
                  },
                },
              },
            }}
            plugins={[ChartDataLabels]}
            height={320}
          />
        ) : (
          <div>차트 데이터를 불러오는 중...</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 320 }}>
        <h4>연도별 배당금 합계</h4>
        {yearChart ? (
          <Bar
            data={yearChart}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: true, text: '연도별 배당금 합계' },
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: ctx => `₩ ${Math.round(Number(ctx.parsed.y)).toLocaleString()}`,
                  },
                },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  formatter: value => `₩ ${Math.round(Number(value)).toLocaleString()}`,
                  font: { weight: 'bold' },
                  color: '#333',
                },
              },
              scales: {
                x: { title: { display: true, text: '연도' } },
                y: {
                  title: { display: true, text: '배당금 합계 (₩+달러 단순합산)' },
                  ticks: {
                    callback: value => `₩ ${Math.round(Number(value)).toLocaleString()}`,
                  },
                },
              },
            }}
            plugins={[ChartDataLabels]}
            height={320}
          />
        ) : (
          <div>차트 데이터를 불러오는 중...</div>
        )}
      </div>
      {/* 계좌별 배당금 합계 차트 */}
      <div style={{ flex: 1, minWidth: 320 }}>
        <h4>계좌별 배당금 합계</h4>
        {accountChart ? (
          <Bar
            data={accountChart}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: true, text: '계좌별 배당금 합계' },
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: ctx => `₩ ${Math.round(Number(ctx.parsed.y)).toLocaleString()}`,
                  },
                },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  formatter: value => `₩ ${Math.round(Number(value)).toLocaleString()}`,
                  font: { weight: 'bold' },
                  color: '#333',
                },
              },
              scales: {
                x: { title: { display: true, text: '계좌명' } },
                y: {
                  title: { display: true, text: '배당금 합계 (₩+달러 단순합산)' },
                  ticks: {
                    callback: value => `₩ ${Math.round(Number(value)).toLocaleString()}`,
                  },
                },
              },
            }}
            plugins={[ChartDataLabels]}
            height={320}
          />
        ) : (
          <div>차트 데이터를 불러오는 중...</div>
        )}
      </div>
    <DividendPredictionChart monthChart={monthChart} />
  </div>
);
}

export default DividendChart;
