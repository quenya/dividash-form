export function calculateYtdKpi(monthYearMap, currentYear, currentMonthIndex) {
  const monthCount = Math.max(0, Math.min(11, currentMonthIndex)) + 1;
  const currentYearData = monthYearMap[currentYear] || [];
  const previousYearData = monthYearMap[currentYear - 1] || [];
  const currentMonthAmount = Number(currentYearData[currentMonthIndex]) || 0;
  const previousMonthValue = Number(previousYearData[currentMonthIndex]);
  const previousMonthAmount = Number.isFinite(previousMonthValue) && previousMonthValue > 0
    ? previousMonthValue
    : null;

  const currentYearTotal = currentYearData
    .slice(0, monthCount)
    .reduce((total, amount) => total + (Number(amount) || 0), 0);
  const previousYearTotal = previousYearData
    .slice(0, monthCount)
    .reduce((total, amount) => total + (Number(amount) || 0), 0);
  const monthlyAverage = Math.round(currentYearTotal / monthCount);
  const previousMonthlyAverage = previousYearTotal > 0
    ? Math.round(previousYearTotal / monthCount)
    : null;

  const yoyGrowth = previousYearTotal > 0
    ? Number(((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(1))
    : null;
  const monthlyYoyGrowth = previousMonthAmount !== null
    ? Number(((currentMonthAmount - previousMonthAmount) / previousMonthAmount * 100).toFixed(1))
    : null;
  const monthlyAverageYoyGrowth = previousMonthlyAverage !== null
    ? Number(((monthlyAverage - previousMonthlyAverage) / previousMonthlyAverage * 100).toFixed(1))
    : null;

  return {
    currentYearTotal,
    previousYearTotal,
    monthlyAverage,
    previousMonthlyAverage,
    yoyGrowth,
    monthlyAverageYoyGrowth,
    previousMonthAmount,
    monthlyYoyGrowth,
  };
}
