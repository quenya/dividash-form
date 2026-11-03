import React from 'react';
import { fireEvent, render, screen, act, cleanup } from '@testing-library/react';
import NotificationCenter from './NotificationCenter';
import { useDividendData } from '../hooks/useDividendData';

jest.mock('../hooks/useDividendData', () => ({ useDividendData: jest.fn() }));

const row = { ticker: '069500', payment_date: '2026-11-03', distribution_per_share: 125, currency: 'KRW', source_issuer: 'Issuer', source_url: 'https://issuer.example' };
const data = (overrides = {}) => ({ officialDistributions: [row], eligibleEtfTickers: ['069500'], officialDataError: null, officialSyncStatus: { status: 'success', finished_at: new Date().toISOString(), has_coverage_gaps: false }, loading: false, tickersMap: { '069500': { company_name: 'KODEX 200' } }, error: null, refetch: jest.fn(), ...overrides });

afterEach(() => { cleanup(); jest.useRealTimers(); jest.clearAllMocks(); });

test('opens by button and shows only today official schedules by company name', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
  useDividendData.mockReturnValue(data());
  render(<NotificationCenter />);
  fireEvent.click(screen.getByRole('button', { name: '알림 1개' }));
  expect(screen.getByText('오늘 공식 배당 예정 (1)')).toBeInTheDocument();
  expect(screen.getByText(/최근 배당 내역에서 확인된 ETF 기준이며 전체 보유 종목을 보장하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText('KODEX 200 배당 예정')).toBeInTheDocument();
  expect(screen.queryByText(/069500/)).not.toBeInTheDocument();
});

test('shows honest error and loading states, and never describes failed data as empty', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
  useDividendData.mockReturnValue(data({ officialDataError: 'x', officialDistributions: [] }));
  const view = render(<NotificationCenter />);
  fireEvent.click(screen.getByRole('button', { name: '알림 0개' }));
  expect(screen.getByRole('alert')).toHaveTextContent('확인할 수 없습니다');
  expect(screen.queryByText('오늘 공식 배당 예정 내역이 없습니다.')).not.toBeInTheDocument();
  view.rerender(<NotificationCenter />);
  useDividendData.mockReturnValue(data({ loading: true }));
  view.rerender(<NotificationCenter />);
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
});

test('recalculates local today and refetches at midnight; clears timer on unmount', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-02T23:59:59'));
  const refetch = jest.fn(() => {
    useDividendData.mockReturnValue(data({ refetch, officialDistributions: [row] }));
  });
  useDividendData.mockReturnValue(data({ refetch, officialDistributions: [row] }));
  const view = render(<NotificationCenter />);
  fireEvent.click(screen.getByRole('button', { name: '알림 0개' }));
  expect(screen.getByText('오늘 공식 배당 예정 내역이 없습니다.')).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(1100); });
  expect(refetch).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: '알림 1개' })).toBeInTheDocument();
  view.unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('refetches when opening after background sync and retains loading state', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
  const refetch = jest.fn();
  useDividendData.mockReturnValue(data({ refetch, loading: true, officialDistributions: [] }));
  render(<NotificationCenter />);
  fireEvent.click(screen.getByRole('button', { name: '알림 0개' }));
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
});

test('shows sync warning through existing official warning behavior and missing company name plainly', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
  useDividendData.mockReturnValue(data({ tickersMap: {}, officialSyncStatus: { status: 'partial_failure', finished_at: new Date().toISOString(), has_coverage_gaps: true } }));
  render(<NotificationCenter />);
  fireEvent.click(screen.getByRole('button', { name: '알림 1개' }));
  expect(screen.getByRole('status')).toHaveTextContent('확인이 필요한 종목');
  expect(screen.getByText('종목명 확인 필요 배당 예정')).toBeInTheDocument();
});
