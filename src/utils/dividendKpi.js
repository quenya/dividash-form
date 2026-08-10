export function calculateYtdKpi(monthYearMap, currentYear, currentMonthIndex) {
  const monthCount = Math.max(0, Math.min(11, currentMonthIndex)) + 1;
  const currentYearData = monthYearMap[currentYear] || [];
  const previousYearData = monthYearMap[currentYear - 1] || [];

  const currentYearTotal = currentYearData
    .slice(0, monthCount)
    .reduce((total, amount) => total + (Number(amount) || 0), 0);
  const previousYearTotal = previousYearData
    .slice(0, monthCount)
    .reduce((total, amount) => total + (Number(amount) || 0), 0);

  const yoyGrowth = previousYearTotal > 0
    ? Number(((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(1))
    : null;

  return {
    currentYearTotal,
    previousYearTotal,
    monthlyAverage: Math.round(currentYearTotal / monthCount),
    yoyGrowth,
  };
}
