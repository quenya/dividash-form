import React, { useState } from 'react';

function PasswordForm({ description, message, onSubmit, submitLabel, title }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationMessage('');

    if (password.length < 6) {
      setValidationMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmation) {
      setValidationMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  };

  return (
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h1>{title}</h1>
      {description && <p className="auth-description">{description}</p>}

      <label className="auth-field">
        새 비밀번호
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
      </label>

      <label className="auth-field">
        새 비밀번호 확인
        <input
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength={6}
          required
        />
      </label>

      {validationMessage && <div role="alert" className="auth-message auth-message-error">{validationMessage}</div>}
      {message && <div role="status" className="auth-message">{message}</div>}

      <button type="submit" className="auth-primary-button" disabled={submitting}>
        {submitting ? '처리 중...' : submitLabel}
      </button>
    </form>
  );
}

export default PasswordForm;
