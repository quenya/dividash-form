
import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);


function DividendPredictionChart({ monthChart }) {
  const [chartData, setChartData] = useState(null);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    if (!monthChart) return;

    // 현재 날짜 객체 선언
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth(); // 0~11

    // x축: 현재월+1부터 12개월(예: 2025년 8월~2026년 7월)
    const tempLabels = [];
    const monthYearPairs = [];
    for (let i = 1; i <= 12; i++) {
      let month = nowMonth + i;
      let year = nowYear;
      if (month > 11) {
        month -= 12;
        year += 1;
      }
      tempLabels.push(`${year}년 ${month + 1}월`);
      monthYearPairs.push({ year, month }); // month: 0~11
    }
    setLabels(tempLabels);

    // 2022년부터 모든 연도 데이터 참조, 각 월별 평균값 계산
    const allDatasets = monthChart.datasets;
    // 월별 가중평균 계산 (최근 연도일수록 가중치 높게, 올해 도래하지 않은 달은 올해 데이터 제외)
    const monthAverages = [];
    for (let m = 0; m < 12; m++) {
      let sum = 0, weightSum = 0;
      for (let d = 0; d < allDatasets.length; d++) {
        const year = parseInt(allDatasets[d].label, 10);
        // 올해의 도래하지 않은 달은 올해 데이터 제외
        if (year === nowYear && m > nowMonth) continue;
        // 최근 연도일수록 가중치 높게 (가장 오래된 연도: 1, 최근 연도: n)
        const weight = d + 1;
        const val = allDatasets[d].data[m];
        if (typeof val === 'number') {
          sum += val * weight;
          weightSum += weight;
        }
      }
      monthAverages.push(weightSum ? Math.round(sum / weightSum) : 0);
    }
    // 각 월별로 비교 기준 연도 동적 적용: 예측 월이 올해면 작년 값, 내년이면 올해 값과 비교
    const yhat = [];
    for (let i = 0; i < 12; i++) {
      const { year, month } = monthYearPairs[i];
      let compareYear = year - 1;
      const compareDataset = allDatasets.find(ds => parseInt(ds.label, 10) === compareYear);
      const compareValue = compareDataset ? compareDataset.data[month] : 0;
      yhat.push(Math.max(monthAverages[month], compareValue));
    }
    const yhatLower = yhat.map(v => Math.round(v * 0.9));
    const yhatUpper = yhat.map(v => Math.round(v * 1.1));

    // 실제값: 가장 최근 연도 데이터(올해)
    const latestYear = Math.max(...allDatasets.map(ds => parseInt(ds.label, 10)));
    const latestDataset = allDatasets.find(ds => parseInt(ds.label, 10) === latestYear);
    // 실제값: x축 월에 맞춰서 추출
    const actualValues = monthYearPairs.map(({ year, month }) => {
      if (latestDataset && latestYear === year) {
        return latestDataset.data[month];
      }
      return null;
    });

    setChartData({
      labels: tempLabels,
      datasets: [
        {
          type: 'bar',
          label: '예측 배당금 (Bar)',
          data: yhat,
          backgroundColor: 'rgba(0, 120, 255, 0.2)',
          borderColor: 'blue',
          borderWidth: 1,
        },
        {
          type: 'line',
          label: '예측 배당금 (Line)',
          data: yhat,
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.1)',
          fill: false,
        },
        {
          type: 'line',
          label: '예측 하한',
          data: yhatLower,
          borderColor: 'lightblue',
          borderDash: [5, 5],
          fill: false,
        },
        {
          type: 'line',
          label: '예측 상한',
          data: yhatUpper,
          borderColor: 'lightblue',
          borderDash: [5, 5],
          fill: false,
        },
      ],
    });
  }, [monthChart]);

  if (!chartData) return <div>예측 차트 데이터를 불러오는 중...</div>;

  return (
    <div style={{ flex: 1, minWidth: 320 }}>
      <h4>배당금 예측 차트</h4>
      <Line data={chartData} options={{
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: '배당금 예측 (최근 데이터 기반)' },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (items) => {
                // x축 라벨 그대로 사용
                const idx = items[0].dataIndex;
                return labels[idx];
              },
              label: (ctx) => {
                const value = ctx.parsed.y;
                return `₩ ${Math.round(value).toLocaleString()}`;
              },
            },
          },
          datalabels: {
            display: (ctx) => ctx.dataset.type === 'bar' && ctx.dataIndex % 3 === 0,
            color: 'black',
            anchor: 'end',
            align: 'top',
            font: { weight: 'bold' },
            formatter: (value) => `₩${Math.round(value).toLocaleString()}`,
          },
        },
        scales: {
          x: { title: { display: true, text: '월' } },
          y: { title: { display: true, text: '예측 배당금' } },
        },
      }} height={320} />
    </div>
  );
}

export default DividendPredictionChart;
