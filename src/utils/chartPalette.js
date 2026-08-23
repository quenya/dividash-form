export const CHART_PALETTE = [
  '#4e73df', '#d94b3d', '#168a63', '#b87800',
  '#2e8fa3', '#6b7280', '#d46213', '#805bbf',
];

export const getChartColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];
