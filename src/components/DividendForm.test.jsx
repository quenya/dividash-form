import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DividendForm, { getVerifiedMatchChoices } from './DividendForm';
import insertDividend from '../api/insertDividend';

jest.mock('../api/insertDividend', () => jest.fn(() => Promise.resolve({ success: true })));

jest.mock('../api/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: new Error('accounts migration not applied') })
            })
          })
        };
      }

      return {
      select: (columns) => {
        if (columns === '*') {
          return {
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null })
            })
          };
        }

        if (table === 'ticker_matches') {
          if (columns !== 'source_input, matched_company_name, matched_ticker, market, sector, industry, evidence, confidence, status') {
            return Promise.resolve({ data: null, error: new Error('incomplete match projection') });
          }

          return Promise.resolve({
            data: [
              {
                source_input: '삼성전자',
                matched_company_name: '삼성전자',
                matched_ticker: '005930',
                market: 'KRX',
                sector: 'Technology',
                industry: 'Semiconductors',
                evidence: 'test evidence',
                confidence: 'high',
                status: 'confirmed'
              }
            ],
            error: null
          });
        }

        return Promise.resolve({
          data: [
            {
              account_name: 'IRP',
              company_name: '삼성전자',
              payment_date: '2026-07-20'
            }
          ],
          error: null
        });
      }
      };
    }
  }
}));

test('does not expose normalized-colliding aliases in the input choices', () => {
  const choices = getVerifiedMatchChoices([
    {
      source_input: 'Source Name',
      matched_company_name: 'Apple Inc.',
      matched_ticker: 'AAPL',
      market: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      evidence: 'Issuer verified',
      confidence: 'high',
      status: 'confirmed'
    },
    {
      source_input: ' source name ',
      matched_company_name: 'Microsoft Corporation',
      matched_ticker: 'MSFT',
      market: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      evidence: 'Issuer verified',
      confidence: 'high',
      status: 'confirmed'
    },
    {
      source_input: 'Third Source',
      matched_company_name: 'Source Name',
      matched_ticker: 'GOOG',
      market: 'NASDAQ',
      sector: 'Technology',
      industry: 'Internet Content',
      evidence: 'Issuer verified',
      confidence: 'high',
      status: 'confirmed'
    }
  ]);

  expect(choices).toEqual(expect.arrayContaining(['Third Source', 'GOOG']));
  expect(choices).not.toContain('Source Name');
});

test('does not expose a company alias shared by different canonical tickers', () => {
  const choices = getVerifiedMatchChoices([
    {
      source_input: 'Source A',
      matched_company_name: 'Shared Issuer',
      matched_ticker: 'AAPL',
      market: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      evidence: 'Issuer verified',
      confidence: 'high',
      status: 'confirmed'
    },
    {
      source_input: 'Source B',
      matched_company_name: 'Shared Issuer',
      matched_ticker: 'MSFT',
      market: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      evidence: 'Issuer verified',
      confidence: 'high',
      status: 'confirmed'
    }
  ]);

  expect(choices).toEqual(expect.arrayContaining(['Source A', 'Source B', 'AAPL', 'MSFT']));
  expect(choices).not.toContain('Shared Issuer');
});

test('keeps payment date set to today after submitting a dividend', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 24, 9, 0, 0));
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  try {
    render(<DividendForm />);

    fireEvent.change(await screen.findByLabelText(/계좌명/i), { target: { value: 'IRP' } });
    expect(await screen.findByRole('option', { name: '삼성전자' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/종목명/i), { target: { value: '삼성전자' } });
    fireEvent.change(screen.getByPlaceholderText('금액'), { target: { value: '12000' } });

    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-01-15' } });

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(insertDividend).toHaveBeenCalled());
    await waitFor(() => expect(dateInput).toHaveValue('2026-07-24'));
  } finally {
    alertSpy.mockRestore();
    jest.useRealTimers();
  }
});
