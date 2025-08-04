import React, { useState, useEffect } from 'react';
import insertDividend from '../api/insertDividend';
import { supabase } from '../api/supabaseClient';

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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
  const [form, setForm] = useState({
    account_name: '',
    stock: '',
    dividend_amount: '',
    payment_date: getToday(),
    currency: 'KRW',
  });
  const [companyNames, setCompanyNames] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [customStock, setCustomStock] = useState('');
  const [recentDividends, setRecentDividends] = useState([]);

  useEffect(() => {
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
      // 최신순 정렬 후 중복 제거 (종목명)
      const sortedCompanies = (data || [])
        .filter(item => item.payment_date >= oneYearAgoStr)
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
      const recentCompanies = [];
      const seenCompanies = new Set();
      for (const item of sortedCompanies) {
        const name = item.company_name && item.company_name.trim();
        if (name && !seenCompanies.has(name)) {
          recentCompanies.push(name);
          seenCompanies.add(name);
        }
      }
      setCompanyNames(recentCompanies);
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
      setAccountNames(recentAccounts);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // DB 컬럼에 맞게 데이터 변환
    const payload = {
      account_name: form.account_name,
      company_name: form.stock,
      dividend_amount: form.dividend_amount,
      payment_date: form.payment_date,
      currency: form.currency,
    };
    await insertDividend(payload);
    alert('배당금이 등록되었습니다!');
    setForm({ account_name: '', stock: '', dividend_amount: '', payment_date: '', currency: 'KRW' });
    setCustomStock('');
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          계좌명:
          <select
            name="account_name"
            value={form.account_name}
            onChange={handleChange}
            required
            style={{ minWidth: 180, marginLeft: 8 }}
          >
            <option value="">계좌명 선택</option>
            {accountNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
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
