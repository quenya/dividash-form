import { withAlpha } from './chartTheme';

// Bars for a period that has not ended yet (this month, this year) are drawn at reduced opacity.
export const IN_PROGRESS_OPACITY = 0.35;
export const IN_PROGRESS_SUFFIX = ' (진행 중)';

const YOY_FILL_OPACITY = 0.7;

export const periodFill = (hex, inProgress, opacity = 1) =>
  withAlpha(hex, Math.round((inProgress ? opacity * IN_PROGRESS_OPACITY : opacity) * 1000) / 1000);

// Empty months are null; label them with nothing rather than "₩ 0".
export const formatKrwLabel = (value) => {
  if (value === null || value === undefined) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `₩ ${Math.round(number).toLocaleString()}`;
};

export function buildYoyComparison(monthYearMap, currentYear, currentMonth) {
  const current = monthYearMap[currentYear] || Array(12).fill(0);
  const previous = monthYearMap[currentYear - 1] || Array(12).fill(0);
  const data = current.map((value, index) => (index <= currentMonth ? value - previous[index] : null));
  return { data };
}

// Colors are applied at render time from the chart theme so they follow light/dark mode.
export function yoyBarColors(data, inProgressIndex, { gain, loss }) {
  const colorFor = (value) => (value >= 0 ? gain : loss);
  return {
    backgroundColor: data.map((value, index) => (
      value === null ? 'transparent' : periodFill(colorFor(value), index === inProgressIndex, YOY_FILL_OPACITY)
    )),
    borderColor: data.map((value) => (value === null ? 'transparent' : colorFor(value))),
  };
}

const trimNumber = (value) => Number(value.toFixed(1)).toLocaleString('ko-KR');

// Axis ticks in Korean units: 300000 → "30만", 250000000 → "2.5억".
export const formatKrwAxis = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return '0';
  const abs = Math.abs(number);
  if (abs >= 100000000) return `${trimNumber(number / 100000000)}억`;
  if (abs >= 10000) return `${trimNumber(number / 10000)}만`;
  return Math.round(number).toLocaleString('ko-KR');
};

export const UNKNOWN_SECTOR = 'Unknown';
export const UNKNOWN_SECTOR_COLOR = '#6b7280';

export const sectorBarColors = (labels, accent) =>
  labels.map((label) => (label === UNKNOWN_SECTOR ? UNKNOWN_SECTOR_COLOR : accent));

// Monthly chart: the current year as bars, earlier years as lines.
// Only last year's line is shown by default; older years start hidden and can be turned on from the legend.
export function buildMonthlyYearDatasets(monthYearMap, years, currentYear, currentMonth, colorFor) {
  return years.map((year, index) => {
    const color = colorFor(index);
    const yearNumber = Number(year);

    if (yearNumber === currentYear) {
      const fill = monthYearMap[year].map((_, month) => periodFill(color, month === currentMonth));
      return {
        type: 'bar',
        label: year,
        data: monthYearMap[year],
        backgroundColor: fill,
        hoverBackgroundColor: fill,
        borderColor: color,
        borderWidth: 2,
        order: 1,
      };
    }

    return {
      type: 'line',
      label: year,
      data: monthYearMap[year],
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.25,
      fill: false,
      hidden: yearNumber < currentYear - 1,
      order: 0,
    };
  });
}
