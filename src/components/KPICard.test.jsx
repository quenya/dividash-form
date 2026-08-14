import React from 'react';
import { render, screen } from '@testing-library/react';
import KPICard from './KPICard';

describe('KPICard comparison', () => {
  test('shows the same-period label and formatted previous-year total', () => {
    render(<KPICard title="올해 누적 배당금" value="₩ 2,000" change={25} comparisonValue={1600} />);

    expect(screen.getByText('전년 동기 대비 ▲25% (작년 동기 ₩ 1,600)')).toBeInTheDocument();
    expect(screen.queryByText(/vs last year/)).not.toBeInTheDocument();
  });

  test('hides the comparison when there is no comparable previous-year total', () => {
    render(<KPICard title="올해 누적 배당금" value="₩ 2,000" change={null} comparisonValue={0} />);

    expect(screen.queryByText(/전년 동기 대비/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  });

  test('keeps the negative change direction and color', () => {
    render(<KPICard title="올해 누적 배당금" value="₩ 1,200" change={-25} comparisonValue={1600} />);

    const comparison = screen.getByText('전년 동기 대비 ▼25% (작년 동기 ₩ 1,600)');

    expect(comparison.parentElement).toHaveStyle({ color: '#e74c3c' });
  });

  test('supports a month-specific comparison label', () => {
    render(<KPICard title="이번 달 배당금" value="₩ 2,000" change={25} comparisonValue={1600} comparisonLabel="작년 동월 대비" comparisonPeriodLabel="작년 동월" />);

    expect(screen.getByText('작년 동월 대비 ▲25% (작년 동월 ₩ 1,600)')).toBeInTheDocument();
  });

  test('shows the previous year average for the same elapsed-month period', () => {
    render(<KPICard title="월 평균 배당금" value="₩ 2,000" change={25} comparisonValue={1600} comparisonPeriodLabel="작년 1~8월 평균" />);

    expect(screen.getByText('전년 동기 대비 ▲25% (작년 1~8월 평균 ₩ 1,600)')).toBeInTheDocument();
  });
});
