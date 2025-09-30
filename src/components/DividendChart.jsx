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
import { Bar, Chart } from 'react-chartjs-2';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(CategoryScale, LinearScale, BarElement, TreemapController, TreemapElement, Title, Tooltip, Legend, ChartDataLabels);


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
function resolveDatasetColor(dataset, context) {
  if (!dataset) {
    return undefined;
  }

  const index = context?.dataIndex ?? 0;

  if (Array.isArray(dataset.nodeColors) && dataset.nodeColors.length > 0) {
    return dataset.nodeColors[index] ?? dataset.nodeColors[0];
  }

  const background = dataset.backgroundColor;
  if (Array.isArray(background)) {
    return background[index] ?? background[0];
  }

  if (typeof background === 'function') {
    try {
      return background(context);
    } catch (error) {
      console.warn('Treemap color resolver failed:', error);
    }
  }

  return background;
}


function DividendChart() {
  const [monthChart, setMonthChart] = useState(null);
  const [yearChart, setYearChart] = useState(null);
  const [accountChart, setAccountChart] = useState(null);
  const [stockChart, setStockChart] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      // 실시간 환율 fetch
      let USD_KRW = 1300;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
        
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
        // 환율 fetch 실패 시 기본값 사용
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
      // 월별 연도별 집계
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
      // 종목 Treemap 차트 데이터

      let stockArr = Object.entries(stockMap);
      stockArr.sort((a, b) => b[1] - a[1]);

      // 트리맵에서 보여줄 최대 항목 수 (상위 15개)
      stockArr = stockArr.slice(0, 15);

      const colorPalette = [
        'rgb(255, 107, 107)',  // 라이트 레드
        'rgb(78, 205, 196)',   // 민트
        'rgb(69, 183, 209)',   // 스카이 블루
        'rgb(150, 206, 180)',  // 소프트 그린
        'rgb(255, 234, 167)',  // 라이트 옐로
        'rgb(221, 160, 221)',  // 라일락
        'rgb(152, 216, 200)',  // 터쿼이즈
        'rgb(247, 220, 111)',  // 골든 옐로우
        'rgb(187, 143, 206)',  // 라벤더
        'rgb(133, 193, 233)',  // 아쿠아 블루
        'rgb(248, 196, 113)',  // 피치
        'rgb(130, 224, 170)',  // 라이트 그린
        'rgb(241, 148, 138)',  // 살몬
        'rgb(174, 214, 241)',  // 파우더 블루
        'rgb(250, 215, 160)',  // 페일 오렌지
        'rgb(215, 219, 221)',  // 실버 그레이
        'rgb(232, 218, 239)',  // 퍼플 틴트
        'rgb(213, 244, 230)',  // 민트 틴트
        'rgb(250, 219, 216)',  // 코럴 틴트
        'rgb(235, 245, 251)'   // 파스텔 블루
      ];

      const nodeColors = stockArr.map(([, value], index) => colorPalette[index % colorPalette.length]);
      const hoverColors = nodeColors.map(color => {
        const rgbMatch = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
        if (rgbMatch) {
          const r = Math.max(0, parseInt(rgbMatch[1], 10) - 30);
          const g = Math.max(0, parseInt(rgbMatch[2], 10) - 30);
          const b = Math.max(0, parseInt(rgbMatch[3], 10) - 30);
          return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
      });

      const treemapData = stockArr.map(([name, value], index) => ({
        label: name,
        value,
        backgroundColor: nodeColors[index]
      }));

      const maxIndex = stockArr.length ? 0 : -1;

      setStockChart({
        datasets: [
          {
            label: '종목 배당',
            tree: treemapData,
            key: 'value',
            groups: ['label'],
            spacing: 0.5,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.8)',
            backgroundColor: (ctx) => {
              if (ctx.raw && ctx.raw.backgroundColor) {
                return ctx.raw.backgroundColor;
              }
              const idx = ctx.dataIndex ?? 0;
              return nodeColors[idx % nodeColors.length];
            },
            hoverBackgroundColor: (ctx) => {
              const idx = ctx.dataIndex ?? 0;
              return hoverColors[idx % hoverColors.length];
            },
            maxIndex,
            nodeColors,
            nodeHoverColors: hoverColors,
            stockNames: stockArr.map(([name]) => name),
            stockValues: stockArr.map(([, value]) => value)
          }
        ]
      });

      } catch (error) {
        console.error('차트 데이터 처리 오류:', error);
      }
    };
    
    fetchData().catch(error => {
      console.error('fetchData 실행 오류:', error);
    });
    
    return () => {
      isMounted = false;
    };
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
      {/* 종목별 배당금 트리맵 차트 */}
      <div style={{ flex: 1, minWidth: 320 }}>
        <h4>종목별 배당금 합계 (트리맵)</h4>
        {stockChart && stockChart.datasets ? (
          <div style={{ height: '400px', position: 'relative' }}>
            <Chart
              type="treemap"
              data={stockChart}
              plugins={[ChartDataLabels]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        const item = context[0];
                        // 트리맵 데이터에서 라벨 추출
                        if (item.parsed && item.parsed._data) {
                          return item.parsed._data.label || '종목';
                        }
                        if (item.raw && item.raw.label) {
                          return item.raw.label;
                        }
                        if (item.dataset && item.dataset.stockNames && item.dataIndex !== undefined) {
                          return item.dataset.stockNames[item.dataIndex];
                        }
                        return '종목';
                      },
                      label: (context) => {
                        const item = context;
                        let value = null;
                        
                        // 다양한 방법으로 값 추출 시도
                        if (item.parsed && item.parsed.v) {
                          value = item.parsed.v;
                        } else if (item.raw && item.raw.value) {
                          value = item.raw.value;
                        } else if (item.dataset && item.dataset.stockValues && item.dataIndex !== undefined) {
                          value = item.dataset.stockValues[item.dataIndex];
                        }
                        
                        if (value !== null) {
                          return `배당금: ₩${Math.round(value).toLocaleString()}`;
                        }
                        return '배당금: 정보 없음';
                      }
                    }
                  },
                  datalabels: {
                    display: true,
                    color: function(context) {
                      // 배경색에 따라 텍스트 색상 자동 조정
                      const bgColor = resolveDatasetColor(context.dataset, context);
                      
                      // 밝은 색상들 (RGB 형식 기준)
                      const lightColors = [
                        'rgb(255, 234, 167)',  // 따뜻한 노랑
                        'rgb(247, 220, 111)',  // 바나나 옐로우
                        'rgb(150, 206, 180)',  // 민트 그린
                        'rgb(152, 216, 200)',  // 아쿠아민트
                        'rgb(248, 196, 113)',  // 피치
                        'rgb(130, 224, 170)',  // 라이트 그린
                        'rgb(250, 215, 160)',  // 크림
                        'rgb(215, 219, 221)',  // 실버
                        'rgb(232, 218, 239)',  // 라일락
                        'rgb(213, 244, 230)',  // 허니듀
                        'rgb(250, 219, 216)',  // 미스티 로즈
                        'rgb(235, 245, 251)',  // 앨리스 블루
                        'rgb(174, 214, 241)',  // 파우더 블루
                        'rgb(133, 193, 233)'   // 라이트 블루
                      ];
                      
                      const isLightColor = lightColors.includes(bgColor);
                      return isLightColor ? '#000000' : '#FFFFFF';
                    },
                    font: {
                      weight: 'bold',
                      size: function(context) {
                        // 사각형 크기에 따라 폰트 크기 조정
                        const area = context.parsed ? (context.parsed.w * context.parsed.h) : 1000;
                        const dataset = context.dataset || {};
                        const isMax = dataset.maxIndex === context.dataIndex;
                        const baseSize = Math.min(18, Math.max(12, Math.sqrt(area) / 6));
                        return isMax ? Math.min(28, Math.max(baseSize, 20)) : baseSize;
                      },
                      family: 'Arial, sans-serif'
                    },
                    textStrokeColor: function(context) {
                      // 텍스트 외곽선으로 가독성 향상 (텍스트 색상과 반대)
                      const bgColor = resolveDatasetColor(context.dataset, context);
                      
                      const lightColors = [
                        'rgb(255, 234, 167)', 'rgb(247, 220, 111)', 'rgb(150, 206, 180)', 'rgb(152, 216, 200)', 'rgb(248, 196, 113)',
                        'rgb(130, 224, 170)', 'rgb(250, 215, 160)', 'rgb(215, 219, 221)', 'rgb(232, 218, 239)', 'rgb(213, 244, 230)',
                        'rgb(250, 219, 216)', 'rgb(235, 245, 251)', 'rgb(174, 214, 241)', 'rgb(133, 193, 233)'
                      ];
                      
                      const isLightColor = lightColors.includes(bgColor);
                      // 텍스트와 반대 색상의 외곽선 사용
                      return isLightColor ? '#FFFFFF' : '#000000';
                    },
                    textStrokeWidth: 2,
                    textShadowColor: function(context) {
                      // 텍스트 그림자도 동적 조정
                      const bgColor = resolveDatasetColor(context.dataset, context);
                      
                      const lightColors = [
                        'rgb(255, 234, 167)', 'rgb(247, 220, 111)', 'rgb(150, 206, 180)', 'rgb(152, 216, 200)', 'rgb(248, 196, 113)',
                        'rgb(130, 224, 170)', 'rgb(250, 215, 160)', 'rgb(215, 219, 221)', 'rgb(232, 218, 239)', 'rgb(213, 244, 230)',
                        'rgb(250, 219, 216)', 'rgb(235, 245, 251)', 'rgb(174, 214, 241)', 'rgb(133, 193, 233)'
                      ];
                      
                      const isLightColor = lightColors.includes(bgColor);
                      return isLightColor ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                    },
                    textShadowBlur: 3,
                    formatter: function(value, context) {
                      const dataset = context.dataset || {};
                      const index = context.dataIndex;
                      if (index === undefined) {
                        return '';
                      }

                      const stockNames = dataset.stockNames || [];
                      const stockValues = dataset.stockValues || [];
                      const name = stockNames[index] || '';
                      const amountRaw = stockValues[index];
                      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
                      const isMax = dataset.maxIndex === index;

                      if (isMax) {
                        if (!name) {
                          return '';
                        }
                        return name.length > 18 ? name.substring(0, 18) + '...' : name;
                      }

                      if (!Number.isFinite(amount)) {
                        return '';
                      }

                      const totalDividend = stockValues.reduce((sum, val) => {
                        const numeric = typeof val === 'number' ? val : Number(val);
                        return Number.isFinite(numeric) ? sum + numeric : sum;
                      }, 0);
                      const percentage = totalDividend > 0 ? ((amount / totalDividend) * 100).toFixed(1) : null;

                      let shortName;
                      if (name.length > 12) {
                        shortName = name.substring(0, 12) + '...';
                      } else {
                        shortName = name;
                      }

                      let shortAmount;
                      if (amount >= 100000000) {
                        shortAmount = `₩${(amount / 100000000).toFixed(1)}억`;
                      } else if (amount >= 10000000) {
                        shortAmount = `₩${(amount / 10000000).toFixed(0)}천만`;
                      } else if (amount >= 1000000) {
                        shortAmount = `₩${(amount / 1000000).toFixed(1)}백만`;
                      } else if (amount >= 10000) {
                        shortAmount = `₩${(amount / 10000).toFixed(0)}만`;
                      } else {
                        shortAmount = `₩${(amount / 1000).toFixed(0)}천`;
                      }

                      const area = context.parsed ? (context.parsed.w * context.parsed.h) : 1000;

                      if (area > 15000) {
                        const lines = [shortName, shortAmount];
                        if (percentage !== null) lines.push(`${percentage}%`);
                        lines.push(`#${index + 1}`);
                        return lines;
                      } else if (area > 10000) {
                        const lines = [shortName, shortAmount];
                        if (percentage !== null) lines.push(`${percentage}%`);
                        return lines;
                      } else if (area > 6000) {
                        const lines = [shortName];
                        if (percentage !== null) lines.push(`${percentage}%`);
                        return lines;
                      } else if (area > 3000) {
                        return shortName.length > 8 ? shortName.substring(0, 8) : shortName;
                      } else if (area > 1500) {
                        return percentage !== null ? `${percentage}%` : '';
                      }

                      return `#${index + 1}`;
                    },
                    anchor: 'center',
                    align: 'center',
                    offset: 0,
                    rotation: 0,
                    clip: false,
                    clamp: false,
                    opacity: 1,
                    // 텍스트 박스 배경 (선택사항)
                    backgroundColor: function(context) {
                      const bgColor = resolveDatasetColor(context.dataset, context);
                      const lightColors = [
                        'rgb(255, 234, 167)', 'rgb(247, 220, 111)', 'rgb(150, 206, 180)', 'rgb(152, 216, 200)', 'rgb(248, 196, 113)',
                        'rgb(130, 224, 170)', 'rgb(250, 215, 160)', 'rgb(215, 219, 221)', 'rgb(232, 218, 239)', 'rgb(213, 244, 230)',
                        'rgb(250, 219, 216)', 'rgb(235, 245, 251)', 'rgb(174, 214, 241)', 'rgb(133, 193, 233)'
                      ];
                      
                      const isLightColor = lightColors.includes(bgColor);
                      
                      // 매우 작은 사각형에만 배경 적용
                      const area = context.parsed ? (context.parsed.w * context.parsed.h) : 1000;
                      if (area < 3000) {
                        return isLightColor ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
                      }
                      return 'transparent';
                    },
                    borderColor: function(context) {
                      const bgColor = resolveDatasetColor(context.dataset, context);
                      const lightColors = [
                        'rgb(255, 234, 167)', 'rgb(247, 220, 111)', 'rgb(150, 206, 180)', 'rgb(152, 216, 200)', 'rgb(248, 196, 113)',
                        'rgb(130, 224, 170)', 'rgb(250, 215, 160)', 'rgb(215, 219, 221)', 'rgb(232, 218, 239)', 'rgb(213, 244, 230)',
                        'rgb(250, 219, 216)', 'rgb(235, 245, 251)', 'rgb(174, 214, 241)', 'rgb(133, 193, 233)'
                      ];
                      
                      const isLightColor = lightColors.includes(bgColor);
                      
                      const area = context.parsed ? (context.parsed.w * context.parsed.h) : 1000;
                      if (area < 3000) {
                        return isLightColor ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
                      }
                      return 'transparent';
                    },
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: {
                      top: 2,
                      bottom: 2,
                      left: 4,
                      right: 4
                    }
                  }
                },
                elements: {
                  rectangle: {
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)'
                  }
                },
                layout: {
                  padding: 10
                }
              }}
            />
          </div>
        ) : (
          <div>차트 데이터를 불러오는 중...</div>
        )}
      </div>
    <DividendPredictionChart monthChart={monthChart} />
  </div>
);
}

export default DividendChart;
