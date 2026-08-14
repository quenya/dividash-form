import { calculateYtdKpi } from './dividendKpi';

describe('calculateYtdKpi', () => {
  test('compares current year and previous year through the same month', () => {
    const monthYearMap = {
      2025: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      2026: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 900, 900],
    };

    const result = calculateYtdKpi(monthYearMap, 2026, 7);

    expect(result.currentYearTotal).toBe(1600);
    expect(result.previousYearTotal).toBe(800);
    expect(result.monthlyAverage).toBe(200);
    expect(result.yoyGrowth).toBe(100);
    expect(result.previousMonthAmount).toBe(100);
    expect(result.monthlyYoyGrowth).toBe(100);
  });

  test('does not calculate growth when the comparable previous-year total is zero', () => {
    const result = calculateYtdKpi({ 2026: [100, 200] }, 2026, 1);

    expect(result.currentYearTotal).toBe(300);
    expect(result.previousYearTotal).toBe(0);
    expect(result.yoyGrowth).toBeNull();
    expect(result.previousMonthAmount).toBeNull();
    expect(result.monthlyYoyGrowth).toBeNull();
  });

  test('does not compare a month that has no previous-year dividend', () => {
    const result = calculateYtdKpi({
      2025: [100, 0, 100],
      2026: [200, 300, 400],
    }, 2026, 1);

    expect(result.previousMonthAmount).toBeNull();
    expect(result.monthlyYoyGrowth).toBeNull();
  });
});
