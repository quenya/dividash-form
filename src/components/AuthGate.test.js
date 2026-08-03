import { fireEvent, render, screen } from '@testing-library/react';
import AuthGate from './AuthGate';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
    __esModule: true,
    useAuth: jest.fn()
}));

function renderAuthGate(overrides = {}) {
    const auth = {
        loading: false,
        session: null,
        isPasswordRecovery: false,
        signIn: jest.fn(() => Promise.resolve({ error: null })),
        signUp: jest.fn(() => Promise.resolve({ error: null })),
        requestPasswordReset: jest.fn(() => Promise.resolve({ error: null })),
        updatePassword: jest.fn(() => Promise.resolve({ error: null })),
        clearPasswordRecovery: jest.fn(),
        ...overrides
    };

    useAuth.mockReturnValue(auth);
    render(<AuthGate><div>대시보드</div></AuthGate>);
    return auth;
}

beforeEach(() => {
    jest.clearAllMocks();
});

test('shows a password reset request form and sends the current origin as redirect', async () => {
    const auth = renderAuthGate();

    fireEvent.click(screen.getByRole('button', { name: '비밀번호를 잊으셨나요?' }));
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 이메일 보내기' }));

    expect(auth.requestPasswordReset).toHaveBeenCalledWith(
        'user@example.com',
        window.location.origin
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/재설정 링크/i);
});

test('shows the recovery password form when Supabase emits PASSWORD_RECOVERY', () => {
    renderAuthGate({ isPasswordRecovery: true, session: { user: { email: 'user@example.com' } } });

    expect(screen.getByRole('heading', { name: '비밀번호 재설정' })).toBeInTheDocument();
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
    expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument();
});

test('rejects mismatched passwords before calling Supabase', async () => {
    const auth = renderAuthGate({ isPasswordRecovery: true, session: { user: {} } });

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(auth.updatePassword).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(/일치/i);
});

test('updates the password and exposes a way back to the dashboard', async () => {
    const auth = renderAuthGate({ isPasswordRecovery: true, session: { user: {} } });

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(auth.updatePassword).toHaveBeenCalledWith('new-password');
    expect(await screen.findByText(/비밀번호가 변경되었습니다/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '대시보드로 이동' }));
    expect(auth.clearPasswordRecovery).toHaveBeenCalled();
});
