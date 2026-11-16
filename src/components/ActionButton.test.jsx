import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ActionButton, { useActionStatus } from './ActionButton';

function Harness({ task, showSuccess = true }) {
  const [status, run] = useActionStatus(1000);
  return (
    <ActionButton
      status={status}
      label="등록"
      loadingLabel="등록 중…"
      successLabel="등록 완료"
      onClick={() => run(task, { showSuccess }).catch(() => {})}
    />
  );
}

afterEach(() => {
  jest.useRealTimers();
});

test('shows loading in place, then success, then returns to idle', async () => {
  jest.useFakeTimers();
  let finish;
  const task = () => new Promise((resolve) => { finish = resolve; });
  render(<Harness task={task} />);

  act(() => { screen.getByRole('button', { name: '등록' }).click(); });

  const busy = screen.getByRole('button', { name: '등록 중…' });
  expect(busy).toBeDisabled();
  expect(busy).toHaveAttribute('aria-busy', 'true');

  await act(async () => { finish(); });
  expect(screen.getByRole('button', { name: '등록 완료' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('등록 완료');

  act(() => { jest.advanceTimersByTime(1000); });
  expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('');
});

test('returns to idle without a success state when the task fails', async () => {
  const task = () => Promise.reject(new Error('fail'));
  render(<Harness task={task} />);

  await act(async () => { screen.getByRole('button', { name: '등록' }).click(); });

  expect(screen.getByRole('button', { name: '등록' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: '등록 완료' })).not.toBeInTheDocument();
});

test('can skip the success state for actions whose button disappears', async () => {
  const task = () => Promise.resolve();
  render(<Harness task={task} showSuccess={false} />);

  await act(async () => { screen.getByRole('button', { name: '등록' }).click(); });

  expect(screen.getByRole('button', { name: '등록' })).toBeEnabled();
});
