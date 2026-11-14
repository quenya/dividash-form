import { withAlpha } from './chartTheme';

// Bars for a period that has not ended yet (this month, this year) are drawn at reduced opacity.
export const IN_PROGRESS_OPACITY = 0.35;
export const IN_PROGRESS_SUFFIX = ' (진행 중)';

const YOY_POSITIVE = '#4bc0c0';
const YOY_NEGATIVE = '#ff6384';
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

  const backgroundColor = data.map((value, index) => {
    if (value === null) return 'transparent';
    return periodFill(value >= 0 ? YOY_POSITIVE : YOY_NEGATIVE, index === currentMonth, YOY_FILL_OPACITY);
  });
  const borderColor = data.map((value) => {
    if (value === null) return 'transparent';
    return value >= 0 ? YOY_POSITIVE : YOY_NEGATIVE;
  });

  return { data, backgroundColor, borderColor };
}
