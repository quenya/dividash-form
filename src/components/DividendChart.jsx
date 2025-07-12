import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
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
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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

  useEffect(() => {
    const fetchData = async () => {
      // 실시간 환율 fetch
      let USD_KRW = 1300;
      try {
        const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=KRW');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.rates && json.rates.KRW) {
          USD_KRW = json.rates.KRW;
          console.log(`[환율] USD→KRW 적용 환율: ${USD_KRW}`);
        } else {
          console.log('[환율] 환율 응답 파싱 실패:', json);
        }
      } catch (e) {
        console.log('[환율] 환율 fetch 실패:', e);
        console.log('[환율] 기본값 사용:', USD_KRW);
      }
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('dividend_amount, payment_date, currency');
      if (error) return;
      // 월별 연도별 집계
      const monthYearMap = {};
      const yearMap = {};
      (data || []).forEach(item => {
        if (!item.payment_date) return;
        const [year, month] = item.payment_date.split('-');
        // 환율 적용: USD는 KRW로 환산
        let amount = Number(item.dividend_amount) || 0;
        if (item.currency === 'USD') amount = amount * USD_KRW;
        // 월별 차트: 연도별로 1~12월 집계
        if (!monthYearMap[year]) monthYearMap[year] = Array(12).fill(0);
        monthYearMap[year][parseInt(month, 10) - 1] += amount;
        // 연도별 차트: 연도별 합계
        if (!yearMap[year]) yearMap[year] = 0;
        yearMap[year] += amount;
      });
      // 월별 차트 데이터
      const years = Object.keys(monthYearMap).sort();
      const monthDatasets = years.map((year, idx) => ({
        label: year,
        data: monthYearMap[year],
        backgroundColor: `hsl(${(idx * 60) % 360}, 60%, 60%)`,
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
            backgroundColor: '#4e73df',
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
                    label: ctx => `₩ ${Number(ctx.parsed.y).toLocaleString()}`,
                  },
                },
                datalabels: {
                  anchor: 'end',
                  align: 'top',
                  formatter: value => `₩ ${Number(value).toLocaleString()}`,
                  font: { weight: 'bold' },
                  color: '#333',
                },
              },
              scales: {
                x: { title: { display: true, text: '연도' } },
                y: {
                  title: { display: true, text: '배당금 합계 (₩+달러 단순합산)' },
                  ticks: {
                    callback: value => `₩ ${Number(value).toLocaleString()}`,
                  },
                },
              },
            }}
            height={320}
          />
        ) : (
          <div>차트 데이터를 불러오는 중...</div>
        )}
      </div>
    </div>
  );
}

export default DividendChart;
