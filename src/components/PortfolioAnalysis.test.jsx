import React from 'react';
import { render, screen, within } from '@testing-library/react';
import PortfolioAnalysis from './PortfolioAnalysis';

jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  ArcElement: jest.fn(),
  Legend: jest.fn(),
  Tooltip: jest.fn()
}));

jest.mock('chartjs-plugin-datalabels', () => ({}));

jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div>Doughnut Chart Mock</div>
}));

jest.mock('../api/supabaseClient', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../hooks/useDividendData', () => ({
  __esModule: true,
  useDividendData: () => ({
    data: [
      { ticker: 'LEGACY FUND', dividend_amount: 100, currency: 'KRW' },
      { ticker: 'UNVERIFIED FUND', dividend_amount: 50, currency: 'KRW' },
      { ticker: 'LEGACY', company_name: 'Legacy', dividend_amount: 25, currency: 'KRW' }
    ],
    exchangeRate: 1300,
    loading: false,
    tickerMatchesMap: {
      'LEGACY FUND': {
        status: 'confirmed',
        confidence: 'high',
        matched_ticker: 'AAPL',
        matched_company_name: 'Apple Inc.',
        market: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        evidence: 'Issuer verified'
      },
      'UNVERIFIED FUND': {
        status: 'manual_review',
        confidence: 'low',
        matched_ticker: 'MSFT',
        matched_company_name: 'Possible match',
        evidence: 'Name similarity only'
      },
      LEGACY: {
        status: 'confirmed',
        confidence: 'high',
        matched_ticker: 'AAPL',
        evidence: ''
      }
    },
    tickersMap: {}
  })
}));

test('renders verified names and keeps unconfirmed candidates out of the contribution table', () => {
  render(<PortfolioAnalysis />);

  const contributionTable = screen.getAllByRole('table')[0];
  const contributionTableView = within(contributionTable);

  expect(contributionTableView.getByText('Apple Inc.')).toBeInTheDocument();
  expect(contributionTableView.getByText('AAPL')).toBeInTheDocument();
  expect(contributionTableView.getByText('UNVERIFIED FUND (확인 대기)')).toBeInTheDocument();
  expect(contributionTableView.getByText('LEGACY (확인 대기)')).toBeInTheDocument();
  expect(contributionTableView.queryByText('Possible match')).not.toBeInTheDocument();
  expect(contributionTableView.getByText('UNVERIFIED FUND (확인 대기)')).toHaveClass('portfolio-security-name');
});
