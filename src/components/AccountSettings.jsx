import React, { useState } from 'react';
import PasswordForm from './PasswordForm';
import { useAuth } from '../context/AuthContext';

function AccountSettings({ onBack }) {
  const { updatePassword, user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSubmit = async (password) => {
    setMessage('');
    const { error } = await updatePassword(password);
    setMessage(error ? error.message : '비밀번호가 변경되었습니다.');
  };

  return (
    <section className="account-page" aria-labelledby="account-title">
      <button type="button" className="account-back-button" onClick={onBack}>
        대시보드로 돌아가기
      </button>
      <div className="account-header">
        <p className="account-eyebrow">계정</p>
        <h1 id="account-title">계정 설정</h1>
        <p>로그인 계정과 비밀번호를 관리합니다.</p>
      </div>
      <div className="card account-card">
        <h2>로그인 이메일</h2>
        <p className="account-email">{user?.email || '이메일 정보 없음'}</p>
      </div>
      <PasswordForm
        title="비밀번호 변경"
        description="새 비밀번호를 입력하면 다음 로그인부터 적용됩니다."
        submitLabel="비밀번호 변경"
        message={message}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

export default AccountSettings;
