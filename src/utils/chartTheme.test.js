import fs from 'fs';
import path from 'path';
import { CHART_THEME, getChartTheme, withAlpha } from './chartTheme';

const css = fs.readFileSync(path.join(__dirname, '../styles/App.css'), 'utf8');

const readTokens = (selector) => {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
};

test.each([
  ['light', ':root'],
  ['dark', 'body.dark-mode'],
])('%s chart theme mirrors the CSS tokens', (mode, selector) => {
  const tokens = readTokens(selector);
  const theme = CHART_THEME[mode];

  expect(theme.text).toBe(tokens['--text-secondary']);
  expect(theme.grid).toBe(tokens['--chart-grid']);
  expect(theme.accent).toBe(tokens['--accent-color']);
  expect(theme.gain).toBe(tokens['--gain']);
  expect(theme.loss).toBe(tokens['--loss']);
});

test('selects the theme by mode and builds translucent fills', () => {
  expect(getChartTheme(true)).toBe(CHART_THEME.dark);
  expect(getChartTheme(false)).toBe(CHART_THEME.light);
  expect(withAlpha('#4f8cff', 0.12)).toBe('rgba(79, 140, 255, 0.12)');
});
