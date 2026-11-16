import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'owner@example.com' }, signOut: jest.fn() }),
}));
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleTheme: jest.fn() }),
}));
jest.mock('./NotificationCenter', () => ({ alignment }) => <div data-testid="notification-alignment">{alignment}</div>);

const renderAtWidth = (width, currentPage) => {
  window.innerWidth = width;
  return render(<Layout currentPage={currentPage} setPage={jest.fn()}><p>본문</p></Layout>);
};

afterEach(() => {
  window.innerWidth = 1024;
});

test('desktop navigation marks the current page and groups input pages under 입력', () => {
  renderAtWidth(1024, 'ocr');

  const nav = screen.getByRole('navigation', { name: '주 메뉴' });
  expect(nav).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '입력' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: '입력' })).toHaveClass('is-active');
  expect(screen.getByRole('button', { name: '대시보드' })).not.toHaveAttribute('aria-current');
});

test('passes right alignment on mobile and left alignment in the desktop sidebar', () => {
  const mobile = renderAtWidth(375, 'chart');
  expect(screen.getByTestId('notification-alignment')).toHaveTextContent('right');
  mobile.unmount();
  renderAtWidth(1024, 'chart');
  expect(screen.getByTestId('notification-alignment')).toHaveTextContent('left');
});

test('mobile header icon buttons have accessible names', () => {
  renderAtWidth(375, 'chart');

  expect(screen.getByRole('button', { name: '다크 모드로 전환' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '대시보드' })).toHaveAttribute('aria-current', 'page');
});
