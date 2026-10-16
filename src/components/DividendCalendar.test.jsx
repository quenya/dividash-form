import React from 'react';
import { render, screen } from '@testing-library/react';
import Calendar from 'react-calendar';
import DividendCalendar from './DividendCalendar';

jest.mock('react-calendar', () => ({ __esModule: true, default: jest.fn(() => null) }));

jest.mock('../hooks/useDividendData', () => ({
  useDividendData: () => ({
    data: [{ id: 'actual-1', ticker: '069500', company_name: 'KODEX 200', account_name: '연금계좌', payment_date: '2026-10-16', dividend_amount: 5000, currency: 'KRW' }],
    officialDistributions: [{ ticker: '069500', ex_date: '2026-10-10', payment_date: '2026-10-16', distribution_per_share: 125, currency: 'KRW', source_url: 'https://issuer.example/069500', source_issuer: 'KODEX' }],
    eligibleEtfTickers: ['069500'],
    loading: false,
    error: null,
    exchangeRate: 1300,
  }),
}));

test('renders scheduled distribution beside actual receipt without combining totals', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-16T12:00:00'));
  render(<DividendCalendar />);

  expect(Calendar).toHaveBeenCalledWith(expect.objectContaining({ calendarType: 'gregory' }), expect.anything());
  expect(screen.getByText('예정 · 공식 주당 분배금')).toBeInTheDocument();
  expect(screen.getByText('실제 입금 · 연금계좌')).toBeInTheDocument();
  expect(screen.getByText('KRW 125 / 주')).toBeInTheDocument();
  expect(screen.getByText('₩5,000')).toBeInTheDocument();
  expect(screen.getByText(/실제 입금 합계: ₩ 5,000/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '발행사 공식 내역' })).toHaveAttribute('href', 'https://issuer.example/069500');
  jest.useRealTimers();
});
