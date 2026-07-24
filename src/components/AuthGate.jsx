import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AuthGate({ children }) {
  const { loading, session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

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

  if (session) {
    return children;
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <form className="card" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ShieldCheck size={24} color="var(--accent-color)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>DiviDash 로그인</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              배당 데이터는 로그인된 사용자에게만 표시됩니다.
            </p>
          </div>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          이메일
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          비밀번호
          <input
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            marginBottom: 12,
            padding: '10px 12px',
            border: 'none',
            borderRadius: 4,
            background: 'var(--accent-color)',
            color: '#fff',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? '처리 중...' : mode === 'signIn' ? '로그인' : '가입'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setMessage('');
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--accent-color)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {mode === 'signIn' ? '계정 만들기' : '로그인으로 돌아가기'}
        </button>

        {message && (
          <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-secondary)' }}>
            {message}
          </div>
        )}
      </form>
    </main>
  );
}

export default AuthGate;
