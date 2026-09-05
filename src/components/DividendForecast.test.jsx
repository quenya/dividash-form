import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DividendForecast from './DividendForecast';

const mockUseAuth = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('../api/dividendForecastService', () => ({ getDividendForecast: jest.fn() }));

const forecast = {
  status: 'estimated_with_assumptions',
  actualHistory: [{ ticker: '069500', dividend_amount: 100 }],
  forecast: [{ ticker: '069500', payment_date: '2026-10-15', estimated_amount: 120, currency: 'KRW', source: 'official_reference' }],
  assumptions: [],
  officialMetadata: [{ official_url: 'https://issuer.example/069500', source_updated_at: '2026-09-01' }],
  officialDistributions: [],
  provenance: [{ source: 'dividend_entries', role: 'actual_history' }],
};

test('renders separate actual history, official reference, and provenance link', async () => {
  mockUseAuth.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
  const service = jest.fn().mockResolvedValue(forecast);
  render(<DividendForecast service={service} />);

  expect(screen.getByRole('status')).toHaveTextContent('배당 전망을 계산 중');
  await waitFor(() => expect(screen.getByText('공식 참고')).toBeInTheDocument());
  expect(screen.getByText(/dividend_entries 기반/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /공식 원본 보기/ })).toHaveAttribute('href', 'https://issuer.example/069500');
  expect(service).toHaveBeenCalledWith({}, { horizonMonths: 3 });
});

test('renders honest cannot-calculate and unauthenticated states without calling service', async () => {
  mockUseAuth.mockReturnValue({ session: null, loading: false });
  const service = jest.fn();
  render(<DividendForecast service={service} />);

  expect(await screen.findByText(/로그인 후 사용자 배당 이력/)).toBeInTheDocument();
  expect(service).not.toHaveBeenCalled();
});

test('renders an honest error state when the forecast service fails', async () => {
  mockUseAuth.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
  render(<DividendForecast service={jest.fn().mockRejectedValue(new Error('network'))} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('전망을 불러오지 못했습니다');
});
