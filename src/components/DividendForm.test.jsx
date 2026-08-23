import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DividendForm from './DividendForm';
import insertDividend from '../api/insertDividend';

jest.mock('../api/insertDividend', () => jest.fn(() => Promise.resolve({ success: true })));

jest.mock('../api/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: [],
                error: { message: 'accounts migration not applied' }
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

beforeEach(() => {
  window.localStorage.clear();
});

test('keeps payment date set to today after submitting a dividend', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 24, 9, 0, 0));
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  try {
    render(<DividendForm />);

    fireEvent.change(await screen.findByLabelText(/계좌명/i), { target: { value: 'IRP' } });
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

test('adds a new account and selects it for the current form', async () => {
  render(<DividendForm />);

  fireEvent.click(screen.getByRole('button', { name: '+ 새 계좌 추가' }));
  fireEvent.change(screen.getByLabelText('새 계좌명'), {
    target: { value: '미래에셋 ISA' }
  });
  fireEvent.change(screen.getByLabelText('증권사'), {
    target: { value: '미래에셋증권' }
  });
  fireEvent.click(screen.getByRole('button', { name: '저장 후 사용' }));

  await waitFor(() => expect(screen.getByRole('combobox', { name: /계좌명/i })).toHaveValue('미래에셋 ISA'));
  expect(screen.getByRole('option', { name: '미래에셋 ISA' })).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('dividash.manualAccountNames'))).toContain('미래에셋 ISA');
});

test('rejects a duplicate account name', async () => {
  window.localStorage.setItem('dividash.manualAccountNames', JSON.stringify(['IRP']));
  render(<DividendForm />);

  fireEvent.click(screen.getByRole('button', { name: '+ 새 계좌 추가' }));
  fireEvent.change(screen.getByLabelText('새 계좌명'), { target: { value: ' irp ' } });
  fireEvent.change(screen.getByLabelText('증권사'), { target: { value: '한국투자증권' } });
  fireEvent.click(screen.getByRole('button', { name: '저장 후 사용' }));

  expect(await screen.findByText('이미 등록된 계좌명입니다.')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /계좌명/i })).toHaveValue('');
});
