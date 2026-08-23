import React, { useState, useEffect } from 'react';
import insertDividend from '../api/insertDividend';
import { listAccounts, createAccount } from '../api/accounts';
import { supabase } from '../api/supabaseClient';
import { buildTickerMatchesMap, getVerifiedMatchAliasKeys, isVerifiedMatch, normalizeTickerInput } from '../utils/tickerMatching';

export function getVerifiedMatchChoices(matchData) {
  const matchMap = buildTickerMatchesMap(matchData);
  const verifiedMatches = Object.values(matchMap).filter(isVerifiedMatch);
  const verifiedAliases = getVerifiedMatchAliasKeys(matchMap);

  return [...new Set(
    verifiedMatches
      .flatMap((match) => [match.source_input, match.matched_company_name, match.matched_ticker])
      .filter((alias) => {
        const aliasKey = normalizeTickerInput(alias);
        return aliasKey && verifiedAliases.has(aliasKey);
      })
  )];
}

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function formatAmount(amount, currency) {
  if (amount === undefined || amount === null) return '';
  let symbol = '';
  if (currency === 'KRW') symbol = '\u20A9'; // ₩
  else if (currency === 'USD') symbol = '$';
  else symbol = currency || '';
  return symbol + ' ' + amount.toLocaleString();
}

function DividendForm() {
  const storedAccountNames = (() => {
    try {
      const stored = window.localStorage.getItem('dividash.manualAccountNames');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('저장된 계좌 목록을 불러오지 못했습니다:', error);
      return [];
    }
  })();
  const [form, setForm] = useState({
    account_id: '',
    account_name: '',
    account_type: '',
    account_number_masked: '',
    stock: '',
    dividend_amount: '',
    payment_date: getToday(),
    currency: 'KRW',
  });
  const [companyNames, setCompanyNames] = useState([]);
  const [accountRecords, setAccountRecords] = useState([]);
  const [accountStorageAvailable, setAccountStorageAvailable] = useState(false);
  const [accountNames, setAccountNames] = useState(storedAccountNames);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newBrokerageName, setNewBrokerageName] = useState('');
  const [newAccountType, setNewAccountType] = useState('');
  const [newAccountNumberMasked, setNewAccountNumberMasked] = useState('');
  const [accountError, setAccountError] = useState('');
  const [customStock, setCustomStock] = useState('');
  const [recentDividends, setRecentDividends] = useState([]);

  useEffect(() => {
    const fetchManagedAccounts = async () => {
      const { data, error } = await listAccounts();
      if (error) {
        console.warn('계좌 마스터를 사용할 수 없어 호환 모드로 동작합니다:', error.message);
        return;
      }
      setAccountStorageAvailable(true);
      setAccountRecords(data || []);
      setAccountNames((currentAccountNames) => {
        const managedNames = (data || []).map((account) => account.display_name);
        return [...managedNames, ...currentAccountNames].filter(
          (name, index, names) => name && names.indexOf(name) === index
        );
      });
    };
    fetchManagedAccounts();

    const fetchCompanyAndAccountNames = async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('company_name, account_name, payment_date', { distinct: false });
      if (error) {
        console.error('Supabase distinct 쿼리 에러:', error);
        return;
      }
      const { data: matchData, error: matchError } = await supabase
        .from('ticker_matches')
        .select('source_input, matched_company_name, matched_ticker, market, sector, industry, evidence, confidence, status');
      if (matchError) {
        setCompanyNames([]);
      } else {
        setCompanyNames(getVerifiedMatchChoices(matchData));
      }
      // 최신순 정렬 후 중복 제거 (계좌명)
      const sortedAccounts = (data || [])
        .filter(item => item.payment_date >= oneYearAgoStr)
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
      const recentAccounts = [];
      const seenAccounts = new Set();
      for (const item of sortedAccounts) {
        const acc = item.account_name && item.account_name.trim();
        if (acc && !seenAccounts.has(acc)) {
          recentAccounts.push(acc);
          seenAccounts.add(acc);
        }
      }
      setAccountNames((currentAccountNames) => {
        const mergedAccounts = [...currentAccountNames, ...recentAccounts].filter(
          (name, index, names) => name && names.indexOf(name) === index
        );
        return mergedAccounts;
      });
    };
    fetchCompanyAndAccountNames();

    const fetchRecentDividends = async () => {
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(5);
      if (error) {
        console.error('최근 배당내역 조회 에러:', error);
        return;
      }
      setRecentDividends(data || []);
    };
    fetchRecentDividends();
  }, []);

  const handleChange = (e) => {
    let name = e.target.name;
    if (name === 'amount') name = 'dividend_amount';
    if (name === 'date') name = 'payment_date';
    if (name === 'account_name') {
      const selectedAccount = accountRecords.find((account) => account.display_name === e.target.value);
      setForm({
        ...form,
        account_name: e.target.value,
        account_id: selectedAccount?.id || ''
      });
      return;
    }
    setForm({ ...form, [name]: e.target.value });
    if (name === 'stock') {
      setCustomStock('');
    }
  };

  const handleCurrencyChange = (e) => {
    setForm({ ...form, currency: e.target.value });
  };

  const handleCustomStockChange = (e) => {
    setCustomStock(e.target.value);
    setForm({ ...form, stock: e.target.value });
  };

  const handleAddAccount = async () => {
    const accountName = newAccountName.trim();
    const brokerageName = newBrokerageName.trim();
    if (!accountName || !brokerageName) {
      setAccountError('계좌 표시명과 증권사를 입력해 주세요.');
      return;
    }
    if (accountNames.some((name) => name.toLowerCase() === accountName.toLowerCase())) {
      setAccountError('이미 등록된 계좌명입니다.');
      return;
    }

    let createdAccount = null;
    if (accountStorageAvailable) {
      try {
        createdAccount = await createAccount({
          displayName: accountName,
          brokerageName,
          accountType: newAccountType,
          accountNumberMasked: newAccountNumberMasked
        });
      } catch (error) {
        setAccountError(error.message || '계좌 저장에 실패했습니다.');
        return;
      }
    }

    const nextAccountNames = [...accountNames, accountName];
    setAccountNames(nextAccountNames);
    if (createdAccount) {
      setAccountRecords((currentAccounts) => [createdAccount, ...currentAccounts]);
    }
    setForm({
      ...form,
      account_id: createdAccount?.id || '',
      account_name: accountName,
      account_type: newAccountType,
      account_number_masked: newAccountNumberMasked
    });
    setNewAccountName('');
    setNewBrokerageName('');
    setNewAccountType('');
    setNewAccountNumberMasked('');
    setAccountError('');
    setIsAddingAccount(false);
    try {
      window.localStorage.setItem('dividash.manualAccountNames', JSON.stringify(nextAccountNames));
    } catch (error) {
      console.warn('호환 계좌 목록을 저장하지 못했습니다:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // DB 컬럼에 맞게 데이터 변환
    const payload = {
      account_id: form.account_id || null,
      account_name: form.account_name,
      account_type: form.account_type || null,
      account_number: form.account_number_masked || null,
      company_name: form.stock,
      dividend_amount: form.dividend_amount,
      payment_date: form.payment_date,
      currency: form.currency,
    };
    await insertDividend(payload);
    alert('배당금이 등록되었습니다!');
    setForm({
      account_id: '',
      account_name: '',
      account_type: '',
      account_number_masked: '',
      stock: '',
      dividend_amount: '',
      payment_date: getToday(),
      currency: 'KRW'
    });
    setCustomStock('');
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          계좌명:
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <select
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              required
              style={{ minWidth: 180 }}
            >
              <option value="">계좌명 선택</option>
              {accountNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setIsAddingAccount(!isAddingAccount);
                setAccountError('');
              }}
              style={{ padding: '8px 12px' }}
            >
              {isAddingAccount ? '취소' : '+ 새 계좌 추가'}
            </button>
          </div>
          {isAddingAccount && (
            <div style={{ marginTop: 8, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  value={newAccountName}
                  onChange={(e) => {
                    setNewAccountName(e.target.value);
                    setAccountError('');
                  }}
                  placeholder="표시명 예: 미래에셋 ISA"
                  aria-label="새 계좌명"
                  autoFocus
                />
                <input
                  value={newBrokerageName}
                  onChange={(e) => {
                    setNewBrokerageName(e.target.value);
                    setAccountError('');
                  }}
                  placeholder="증권사 예: 미래에셋증권"
                  aria-label="증권사"
                />
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  aria-label="계좌 유형"
                >
                  <option value="">계좌 유형 선택(선택)</option>
                  <option value="일반계좌">일반계좌</option>
                  <option value="ISA">ISA</option>
                  <option value="IRP">IRP</option>
                  <option value="연금저축">연금저축</option>
                  <option value="기타">기타</option>
                </select>
                <input
                  value={newAccountNumberMasked}
                  onChange={(e) => setNewAccountNumberMasked(e.target.value)}
                  placeholder="마스킹 계좌번호 예: 123-45-****678"
                  aria-label="마스킹 계좌번호"
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleAddAccount}>저장 후 사용</button>
                  <button type="button" onClick={() => setIsAddingAccount(false)}>취소</button>
                </div>
              </div>
              {accountError && <div style={{ color: '#d32f2f', marginTop: 6 }}>{accountError}</div>}
              <small style={{ display: 'block', marginTop: 6, color: 'var(--text-secondary)' }}>
                계좌번호는 전체 번호를 입력하지 말고 마스킹된 값만 입력하세요.
              </small>
            </div>
          )}
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          종목명:
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 4 }}>
            <select
              name="stock"
              value={customStock ? '' : form.stock}
              onChange={handleChange}
              style={{ minWidth: 180, maxWidth: 320, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <option value="">종목명 선택</option>
              {companyNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <span style={{ margin: '0 8px' }}>또는</span>
            <input
              name="customStock"
              value={customStock}
              onChange={handleCustomStockChange}
              placeholder="새 종목명 입력"
              style={{ minWidth: 120, maxWidth: 220 }}
            />
          </div>
        </label>
        <div style={{ margin: '12px 0' }}>
          <span style={{ marginRight: 8 }}>통화:</span>
          <div style={{ display: 'inline-flex', borderBottom: '2px solid #e0e0e0', borderRadius: 4 }}>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'none',
                padding: '8px 24px',
                cursor: 'pointer',
                fontWeight: form.currency === 'KRW' ? 'bold' : 'normal',
                borderBottom: form.currency === 'KRW' ? '3px solid #1976d2' : 'none',
                color: form.currency === 'KRW' ? '#1976d2' : '#555',
                outline: 'none',
                fontSize: '1em',
                transition: 'border-bottom 0.2s'
              }}
              onClick={() => setForm({ ...form, currency: 'KRW' })}
            >
              원화
            </button>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'none',
                padding: '8px 24px',
                cursor: 'pointer',
                fontWeight: form.currency === 'USD' ? 'bold' : 'normal',
                borderBottom: form.currency === 'USD' ? '3px solid #1976d2' : 'none',
                color: form.currency === 'USD' ? '#1976d2' : '#555',
                outline: 'none',
                fontSize: '1em',
                transition: 'border-bottom 0.2s'
              }}
              onClick={() => setForm({ ...form, currency: 'USD' })}
            >
              달러
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            minWidth: 24,
            fontSize: '1.1em',
            color: '#888',
            marginRight: 4
          }}>
            {form.currency === 'KRW' ? '₩' : form.currency === 'USD' ? '$' : ''}
          </span>
          <input
            name="amount"
            value={form.dividend_amount}
            onChange={handleChange}
            placeholder="금액"
            required
            type="number"
            style={{ textAlign: 'right', flex: 1 }}
          />
        </div>
        <input name="date" value={form.payment_date} onChange={handleChange} placeholder="날짜" required type="date" />
        <button type="submit">등록</button>
      </form>
      <div style={{ marginTop: 24 }}>
        <h4>최근 등록된 배당내역</h4>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.95em' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ddd', padding: '6px' }}>계좌명</th>
              <th style={{ border: '1px solid #ddd', padding: '6px' }}>종목명</th>
              <th style={{ border: '1px solid #ddd', padding: '6px' }}>금액</th>
              <th style={{ border: '1px solid #ddd', padding: '6px' }}>통화</th>
              <th style={{ border: '1px solid #ddd', padding: '6px' }}>날짜</th>
            </tr>
          </thead>
          <tbody>
            {recentDividends.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.account_name}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.company_name}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{formatAmount(item.dividend_amount, item.currency)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.currency}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.payment_date}</td>
              </tr>
            ))}
            {recentDividends.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '8px' }}>최근 내역 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default DividendForm;
