// Chart.js draws on <canvas>, which cannot resolve CSS variables such as
// var(--text-secondary). These values mirror the tokens in styles/App.css;
// chartTheme.test.js fails if the two drift apart.
export const CHART_THEME = {
  light: {
    text: '#636e72', // --text-secondary
    grid: 'rgba(0, 0, 0, 0.06)', // --chart-grid
    accent: '#4f8cff', // --accent-color
    tooltipBg: 'rgba(0, 0, 0, 0.8)',
    tooltipText: '#ffffff',
  },
  dark: {
    text: '#a1a1aa',
    grid: 'rgba(255, 255, 255, 0.08)',
    accent: '#5c7cfa',
    tooltipBg: 'rgba(0, 0, 0, 0.85)',
    tooltipText: '#ffffff',
  },
};

export const getChartTheme = (isDarkMode) => CHART_THEME[isDarkMode ? 'dark' : 'light'];

export const withAlpha = (hex, alpha) => {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
