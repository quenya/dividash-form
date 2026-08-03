import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordForm from './PasswordForm';

function AuthGate({ children }) {
  const {
    clearPasswordRecovery,
    isPasswordRecovery,
    loading,
    requestPasswordReset,
    session,
    signIn,
    signUp,
    updatePassword
  } = useAuth();
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [recoveryComplete, setRecoveryComplete] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery) {
      setRecoveryComplete(false);
    }
  }, [isPasswordRecovery]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    if (mode === 'requestReset') {
      const { error } = await requestPasswordReset(email.trim(), window.location.origin);
      setMessage(error ? error.message : '등록된 이메일이라면 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인하세요.');
      setSubmitting(false);
      return;
    }

    const authAction = mode === 'signIn' ? signIn : signUp;
    const { error } = await authAction(email.trim(), password);

    if (error) {
      setMessage(error.message);
    } else if (mode === 'signUp') {
      setMessage('가입 요청이 처리되었습니다. 이메일 확인이 필요한 설정이면 메일함을 확인하세요.');
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        인증 상태 확인 중...
      </main>
    );
  }

  if (isPasswordRecovery) {
    if (recoveryComplete) {
      return (
        <main className="auth-page">
          <div className="card auth-card">
            <h1>비밀번호가 변경되었습니다.</h1>
            <p className="auth-description">새 비밀번호로 계정을 계속 사용할 수 있습니다.</p>
            <button type="button" className="auth-primary-button" onClick={clearPasswordRecovery}>
              대시보드로 이동
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="auth-page">
        <PasswordForm
          title="비밀번호 재설정"
          description="새 비밀번호를 입력해 계정을 보호하세요."
          submitLabel="비밀번호 변경"
          message={message}
          onSubmit={async (nextPassword) => {
            setMessage('');
            const { error } = await updatePassword(nextPassword);
            if (error) {
              setMessage(error.message);
              return;
            }
            setRecoveryComplete(true);
          }}
        />
      </main>
    );
  }

  if (session) {
    return children;
  }

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-heading">
          <ShieldCheck size={24} color="var(--accent-color)" />
          <div>
            <h1>DiviDash 로그인</h1>
            <p className="auth-description">
              배당 데이터는 로그인된 사용자에게만 표시됩니다.
            </p>
          </div>
        </div>

        <label className="auth-field">
          이메일
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {mode !== 'requestReset' && (
          <label className="auth-field">
            비밀번호
            <input
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
        )}

        <button type="submit" className="auth-primary-button" disabled={submitting}>
          {submitting ? '처리 중...' : mode === 'signIn' ? '로그인' : mode === 'requestReset' ? '재설정 이메일 보내기' : '가입'}
        </button>

        {mode !== 'requestReset' && (
          <button type="button" className="auth-secondary-button" onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setMessage('');
          }}>
            {mode === 'signIn' ? '계정 만들기' : '로그인으로 돌아가기'}
          </button>
        )}

        {mode === 'signIn' && <button type="button" className="auth-link-button" onClick={() => {
          setMode('requestReset');
          setMessage('');
        }}>비밀번호를 잊으셨나요?</button>}

        {mode === 'requestReset' && <button type="button" className="auth-link-button" onClick={() => {
          setMode('signIn');
          setMessage('');
        }}>로그인으로 돌아가기</button>}

        {message && <div role="status" className="auth-message">{message}</div>}
      </form>
    </main>
  );
}

export default AuthGate;
