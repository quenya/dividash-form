import { fireEvent, render, screen } from '@testing-library/react';
import Layout from './Layout';

jest.mock('../context/ThemeContext', () => ({
    __esModule: true,
    useTheme: () => ({ isDarkMode: false, toggleTheme: jest.fn() })
}));

jest.mock('../context/AuthContext', () => ({
    __esModule: true,
    useAuth: () => ({ user: { email: 'user@example.com' }, signOut: jest.fn() })
}));

jest.mock('./NotificationCenter', () => function NotificationCenter() {
    return <div>알림</div>;
});

test('opens the account page from the desktop account area', () => {
    const setPage = jest.fn();
    render(<Layout currentPage="chart" setPage={setPage}><div>내용</div></Layout>);

    fireEvent.click(screen.getByRole('button', { name: '계정 설정' }));

    expect(setPage).toHaveBeenCalledWith('account');
});
