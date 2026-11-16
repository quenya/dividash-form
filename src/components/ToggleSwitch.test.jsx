import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ToggleSwitch from './ToggleSwitch';

test('exposes switch semantics and toggles the value', () => {
  const onChange = jest.fn();
  const { rerender } = render(<ToggleSwitch checked label="배당금 재투자" onChange={onChange} />);

  const toggle = screen.getByRole('switch', { name: '배당금 재투자' });
  expect(toggle).toHaveAttribute('aria-checked', 'true');

  fireEvent.click(toggle);
  expect(onChange).toHaveBeenCalledWith(false);

  rerender(<ToggleSwitch checked={false} label="배당금 재투자" onChange={onChange} />);
  expect(screen.getByRole('switch', { name: '배당금 재투자' })).toHaveAttribute('aria-checked', 'false');
});
