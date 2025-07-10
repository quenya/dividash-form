import React, { useState, useEffect } from 'react';
import insertDividend from '../api/insertDividend';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function DividendForm() {
  const [form, setForm] = useState({
    stock: '',
    amount: '',
    date: ''
  });
  const [accountNames, setAccountNames] = useState([]);
  const [customStock, setCustomStock] = useState('');

  useEffect(() => {
    const fetchAccountNames = async () => {
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('account_name', { distinct: true });
      if (error) {
        console.error('Supabase distinct 쿼리 에러:', error);
        return;
      }
      setAccountNames(
        (data || [])
          .map(item => item.account_name)
          .filter(Boolean)
      );
    };
    fetchAccountNames();
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
    <form onSubmit={handleSubmit}>
      <label>
        종목명:
        <select name="stock" value={customStock ? '' : form.stock} onChange={handleChange}>
          <option value="">종목명 선택</option>
          {accountNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <span style={{ margin: '0 8px' }}>또는</span>
        <input
          name="customStock"
          value={customStock}
          onChange={handleCustomStockChange}
          placeholder="새 종목명 입력"
        />
      </label>
      <input name="amount" value={form.amount} onChange={handleChange} placeholder="금액" required type="number" />
      <input name="date" value={form.date} onChange={handleChange} placeholder="날짜" required type="date" />
      <button type="submit">등록</button>
    </form>
  );
}

export default DividendForm;
