import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SegmentedControl from './SegmentedControl';

const options = [
  { value: 'KRW', label: '원화' },
  { value: 'USD', label: '달러' },
];

test('marks the selected option and reports a new choice', () => {
  const onChange = jest.fn();
  render(<SegmentedControl label="통화" options={options} value="KRW" onChange={onChange} variant="underline" />);

  expect(screen.getByRole('group', { name: '통화' })).toHaveClass('segmented--underline');
  expect(screen.getByRole('button', { name: '원화' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '달러' })).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(screen.getByRole('button', { name: '달러' }));
  expect(onChange).toHaveBeenCalledWith('USD');
});
