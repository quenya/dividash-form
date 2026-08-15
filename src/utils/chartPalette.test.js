import { CHART_PALETTE, getChartColor } from './chartPalette';

describe('chart year colors', () => {
  test('assigns distinct colors to the first years', () => {
    const colors = [0, 1, 2, 3].map(getChartColor);

    expect(new Set(colors).size).toBe(colors.length);
  });

  test('uses the same indexed color for related year series', () => {
    expect(getChartColor(2)).toBe(CHART_PALETTE[2]);
  });

  test('keeps the color rule consistent when the palette wraps', () => {
    expect(getChartColor(CHART_PALETTE.length)).toBe(getChartColor(0));
  });
});
