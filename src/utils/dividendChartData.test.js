import {
  buildMonthlyYearDatasets,
  buildYoyComparison,
  formatKrwAxis,
  formatKrwLabel,
  periodFill,
  sectorBarColors,
} from './dividendChartData';

describe('formatKrwLabel', () => {
  test('leaves months without data unlabeled', () => {
    expect(formatKrwLabel(null)).toBe('');
    expect(formatKrwLabel(undefined)).toBe('');
    expect(formatKrwLabel('not a number')).toBe('');
  });

  test('labels real values, including a real zero change', () => {
    expect(formatKrwLabel(0)).toBe('₩ 0');
    expect(formatKrwLabel(12345.6)).toBe('₩ 12,346');
    expect(formatKrwLabel(-4200)).toBe('₩ -4,200');
  });
});

describe('periodFill', () => {
  test('fades only the in-progress period', () => {
    expect(periodFill('#4e73df', false)).toBe('rgba(78, 115, 223, 1)');
    expect(periodFill('#4e73df', true)).toBe('rgba(78, 115, 223, 0.35)');
    expect(periodFill('#4bc0c0', true, 0.7)).toBe('rgba(75, 192, 192, 0.245)');
  });
});

describe('buildYoyComparison', () => {
  const months = (values) => Array.from({ length: 12 }, (_, index) => values[index] ?? 0);

  test('compares months up to the current one and leaves later months empty', () => {
    const result = buildYoyComparison({
      2025: months([100, 200, 300, 400]),
      2026: months([150, 150, 300, 50]),
    }, 2026, 3);

    expect(result.data.slice(0, 4)).toEqual([50, -50, 0, -350]);
    expect(result.data.slice(4)).toEqual(Array(8).fill(null));
    expect(result.backgroundColor.slice(4)).toEqual(Array(8).fill('transparent'));
  });

  test('fades the current month and keeps sign colors', () => {
    const { backgroundColor, borderColor } = buildYoyComparison({
      2025: months([100, 200]),
      2026: months([150, 100]),
    }, 2026, 1);

    expect(backgroundColor[0]).toBe('rgba(75, 192, 192, 0.7)');
    expect(backgroundColor[1]).toBe('rgba(255, 99, 132, 0.245)');
    expect(borderColor.slice(0, 2)).toEqual(['#4bc0c0', '#ff6384']);
  });

  test('treats a missing previous year as zero', () => {
    const { data } = buildYoyComparison({ 2026: months([80]) }, 2026, 0);
    expect(data[0]).toBe(80);
  });
});

describe('formatKrwAxis', () => {
  test('uses 만 and 억 units', () => {
    expect(formatKrwAxis(0)).toBe('0');
    expect(formatKrwAxis(5000)).toBe('5,000');
    expect(formatKrwAxis(300000)).toBe('30만');
    expect(formatKrwAxis(2500000)).toBe('250만');
    expect(formatKrwAxis(125000)).toBe('12.5만');
    expect(formatKrwAxis(-50000)).toBe('-5만');
    expect(formatKrwAxis(250000000)).toBe('2.5억');
  });
});

describe('sectorBarColors', () => {
  test('marks only the Unknown sector in gray', () => {
    expect(sectorBarColors(['ETF', 'Unknown', 'Technology'], '#4f8cff')).toEqual(['#4f8cff', '#6b7280', '#4f8cff']);
  });
});

describe('buildMonthlyYearDatasets', () => {
  const twelve = (value) => Array(12).fill(value);
  const colors = ['#aaaaaa', '#bbbbbb', '#cccccc'];

  test('draws this year as bars and earlier years as lines, showing only last year by default', () => {
    const datasets = buildMonthlyYearDatasets(
      { 2024: twelve(1), 2025: twelve(2), 2026: twelve(3) },
      ['2024', '2025', '2026'], 2026, 10, (index) => colors[index]
    );

    expect(datasets.map((dataset) => [dataset.label, dataset.type, Boolean(dataset.hidden)])).toEqual([
      ['2024', 'line', true],
      ['2025', 'line', false],
      ['2026', 'bar', false],
    ]);
    expect(datasets[2].backgroundColor[9]).toBe('rgba(204, 204, 204, 1)');
    expect(datasets[2].backgroundColor[10]).toBe('rgba(204, 204, 204, 0.35)');
  });

  test('keeps every year as a line when this year has no data yet', () => {
    const datasets = buildMonthlyYearDatasets({ 2025: twelve(2) }, ['2025'], 2026, 0, (index) => colors[index]);
    expect(datasets[0]).toMatchObject({ type: 'line', hidden: false });
  });
});
