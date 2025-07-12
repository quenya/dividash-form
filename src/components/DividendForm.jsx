import React, { useState, useEffect } from 'react';
import insertDividend from '../api/insertDividend';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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
    stock: '',
    amount: '',
    date: getToday()
  });
  const [companyNames, setCompanyNames] = useState([]);
  const [customStock, setCustomStock] = useState('');
  const [recentDividends, setRecentDividends] = useState([]);

  useEffect(() => {
    const fetchCompanyNames = async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('company_name, payment_date', { distinct: false });
      if (error) {
        console.error('Supabase distinct 쿼리 에러:', error);
        return;
      }
      // 1년 이내 입금 내역이 있는 종목만 추출
      const recentCompanies = Array.from(new Set(
        (data || [])
          .filter(item => item.payment_date >= oneYearAgoStr)
          .map(item => item.company_name)
          .filter(Boolean)
          .map(name => name.trim())
      ));
      setCompanyNames(recentCompanies);
    };
    fetchCompanyNames();

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
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'stock') {
      setCustomStock('');
    }
  };

  const handleCustomStockChange = (e) => {
    setCustomStock(e.target.value);
    setForm({ ...form, stock: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await insertDividend(form);
    alert('배당금이 등록되었습니다!');
    setForm({ stock: '', amount: '', date: '' });
    setCustomStock('');
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
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
        <input name="amount" value={form.amount} onChange={handleChange} placeholder="금액" required type="number" style={{ textAlign: 'right' }} />
        <input name="date" value={form.date} onChange={handleChange} placeholder="날짜" required type="date" />
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
