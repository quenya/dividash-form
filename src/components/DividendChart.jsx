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
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  const [accountChart, setAccountChart] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // 실시간 환율 fetch
      let USD_KRW = 1300;
      try {
        // frankfurter.app API 사용 (무료, 키 필요 없음)
        const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.rates && json.rates.KRW) {
          USD_KRW = json.rates.KRW;
          console.log(`[환율] USD→KRW 적용 환율 (frankfurter.app): ${USD_KRW}`);
        } else {
          console.log('[환율] 환율 응답 파싱 실패:', json);
        }
      } catch (e) {
        console.log('[환율] 환율 fetch 실패:', e);
        console.log('[환율] 기본값 사용:', USD_KRW);
      }
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('dividend_amount, payment_date, currency, account_name');
      if (error) return;
      // 월별 연도별 집계
      const monthYearMap = {};
      const yearMap = {};
      // 계좌별 집계용
      const accountMap = {};
      (data || []).forEach(item => {
        if (!item.payment_date) return;
        const [year, month] = item.payment_date.split('-');
        // 환율 적용: USD는 KRW로 환산
        let amount = Number(item.dividend_amount) || 0;
        if (item.currency === 'USD') amount = amount * USD_KRW;
        amount = Math.round(amount); // 소수점 반올림
        // 월별 차트: 연도별로 1~12월 집계
        if (!monthYearMap[year]) monthYearMap[year] = Array(12).fill(0);
        monthYearMap[year][parseInt(month, 10) - 1] += amount;
        // 연도별 차트: 연도별 합계
        if (!yearMap[year]) yearMap[year] = 0;
        yearMap[year] += amount;
        // 계좌별 차트: 계좌명별 합계
        const acc = (item.account_name || '').trim();
        if (acc) {
          if (!accountMap[acc]) accountMap[acc] = 0;
          accountMap[acc] += amount;
        }
      });
      // 월별 차트 데이터
      const years = Object.keys(monthYearMap).sort();
      // 명확한 색상 팔레트 (최대 8개, 부족하면 hsl fallback)
      const palette = [
        '#4e73df', // 파랑
        '#e74a3b', // 빨강
        '#1cc88a', // 초록
        '#f6c23e', // 노랑
        '#36b9cc', // 청록
        '#858796', // 회색
        '#fd7e14', // 오렌지
        '#6f42c1', // 보라
      ];
      // 월별 예측: 이번달~12월은 작년 데이터만으로 예측
      const now = new Date();
      const thisYear = now.getFullYear();
      const nextYear = thisYear + 1;
      const thisMonth = now.getMonth(); // 0~11
      const lastYear = (thisYear - 1).toString();
      // 실제 데이터 시리즈
      const monthDatasets = years.map((year, idx) => ({
        label: year,
        data: monthYearMap[year],
        backgroundColor: palette[idx % palette.length] || `hsl(${(idx * 60) % 360}, 70%, 55%)`,
        borderColor: palette[idx % palette.length] || `hsl(${(idx * 60) % 360}, 70%, 40%)`,
        borderWidth: 2,
        hoverBackgroundColor: palette[idx % palette.length] || `hsl(${(idx * 60) % 360}, 70%, 40%)`,
      }));
      // ...예측 데이터 시리즈 제거...
      setMonthChart({
        labels: MONTH_LABELS,
        datasets: monthDatasets,
      });
      // 연도별 예측: 최근 1~3년 평균
      // 최근 3년(올해 제외, 데이터 있는 연도만) 구하기
      const sortedYears = Object.keys(yearMap)
        .map(Number)
        .filter(y => y < thisYear)
        .sort((a, b) => b - a);
      const recentYears = sortedYears.slice(0, 3).map(String);
      let yearAvg = 0;
      if (recentYears.length > 0) {
        let sum = 0, cnt = 0;
        for (const y of recentYears) {
          if (yearMap[y]) {
            sum += yearMap[y];
            cnt++;
          }
        }
        yearAvg = cnt ? Math.round(sum / cnt) : 0;
      }
      // 연도별 실제 데이터만 시리즈
      setYearChart({
        labels: years,
        datasets: [
          {
            label: '연도별 배당금 합계',
            data: years.map(y => yearMap[y]),
            backgroundColor: years.map(() => '#4e73df'),
            borderColor: years.map(() => '#4e73df'),
            borderWidth: 2,
            borderDash: years.map(() => []),
          },
        ],
      });
      // 계좌별 차트 데이터 (금액 내림차순 정렬)
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
    </div>
  );
}

export default DividendChart;
