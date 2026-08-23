import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DividendForm, { getCompanyNameChoices, getVerifiedMatchChoices, maskAccountNumber } from './DividendForm';
import insertDividend from '../api/insertDividend';

jest.mock('../api/insertDividend', () => jest.fn(() => Promise.resolve({ success: true })));

jest.mock('../api/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null })
    },
    from: (table) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: [{ id: 'account-1', display_name: '한국투자 일반', brokerage_name: '한국투자증권', account_type: '일반계좌' }],
                error: null
              })
            })
          }),
          insert: (rows) => ({
            select: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'account-new',
                  display_name: rows[0].display_name,
                  brokerage_name: rows[0].brokerage_name,
                  account_type: rows[0].account_type,
                  is_active: true
                },
                error: null
              })
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

test('masks unmasked account number segments before saving', () => {
  expect(maskAccountNumber('788-8096-5074-0')).toBe('788-****-****-0');
  expect(maskAccountNumber('788-****-****-0')).toBe('788-****-****-0');
});

test('falls back to existing dividend company names when ticker matches are unavailable', () => {
  const choices = getCompanyNameChoices(
    [{ company_name: 'TIGER 미국배당다우존스' }, { company_name: ' TIGER 미국배당다우존스 ' }, { company_name: 'SCHD' }],
    [],
    new Error('ticker_matches table does not exist')
  );

  expect(choices).toEqual(['TIGER 미국배당다우존스', 'SCHD']);
});

test('orders company choices by most recent dividend payment date', () => {
  const choices = getCompanyNameChoices([
    { company_name: 'Older Fund', payment_date: '2026-01-10' },
    { company_name: 'Newest Fund', payment_date: '2026-07-20' },
    { company_name: 'Middle Fund', payment_date: '2026-04-15' },
    { company_name: 'Newest Fund', payment_date: '2026-06-01' }
  ], [], new Error('ticker_matches table does not exist'));

  expect(choices).toEqual(['Newest Fund', 'Middle Fund', 'Older Fund']);
});

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

  expect(choices).toEqual([]);
  expect(choices).not.toContain('Third Source');
  expect(choices).not.toContain('GOOG');
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

  expect(choices).toEqual([]);
  expect(choices).not.toContain('Source A');
  expect(choices).not.toContain('Source B');
  expect(choices).not.toContain('AAPL');
  expect(choices).not.toContain('MSFT');
  expect(choices).not.toContain('Shared Issuer');
});

test('shows only the canonical English name for a US market match', () => {
  const choices = getVerifiedMatchChoices([
    {
      source_input: '맥도날드',
      matched_company_name: 'McDonalds Corporation',
      matched_ticker: 'MCD',
      market: 'NYSE',
      sector: 'Consumer Cyclical',
      industry: 'Restaurants',
      evidence: 'User-confirmed mapping',
      confidence: 'high',
      status: 'confirmed'
    }
  ]);

  expect(choices).toEqual(['McDonalds Corporation']);
});

test('reuses an existing brokerage and supports the DC account type', async () => {
  const user = userEvent.setup();
  render(<DividendForm />);

  await user.click(screen.getByRole('button', { name: '+ 새 계좌 추가' }));
  await waitFor(() => expect(screen.getByRole('option', { name: '한국투자증권' })).toBeInTheDocument());
  await user.type(screen.getByLabelText('새 계좌명'), '한국투자 DC');
  await user.selectOptions(screen.getByLabelText('증권사'), '한국투자증권');
  await user.selectOptions(screen.getByLabelText('계좌 유형'), 'DC');
  expect(screen.getByLabelText('증권사')).toHaveValue('한국투자증권');
  expect(screen.getByLabelText('계좌 유형')).toHaveValue('DC');
  await user.click(screen.getByRole('button', { name: '저장 후 사용' }));

  await waitFor(() => expect(screen.getByRole('combobox', { name: /계좌명/i })).toHaveValue('한국투자 DC'));
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
