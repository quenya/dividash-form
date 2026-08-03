import { fireEvent, render, screen } from '@testing-library/react';
import AccountSettings from './AccountSettings';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
    __esModule: true,
    useAuth: jest.fn()
}));

test('updates the signed-in user password from the account screen', async () => {
    const updatePassword = jest.fn(() => Promise.resolve({ error: null }));
    const onBack = jest.fn();
    useAuth.mockReturnValue({
        updatePassword,
        user: { email: 'user@example.com' }
    });

    render(<AccountSettings onBack={onBack} />);

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(updatePassword).toHaveBeenCalledWith('new-password');
    expect(await screen.findByRole('status')).toHaveTextContent(/비밀번호가 변경되었습니다/i);

    fireEvent.click(screen.getByRole('button', { name: '대시보드로 돌아가기' }));
    expect(onBack).toHaveBeenCalled();
});
