import React, { useState } from 'react';
import insertDividend from '../api/insertDividend';

function DividendForm() {
  const [form, setForm] = useState({
    stock: '',
    amount: '',
    date: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await insertDividend(form);
    alert('배당금이 등록되었습니다!');
    setForm({ stock: '', amount: '', date: '' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="stock" value={form.stock} onChange={handleChange} placeholder="종목명" required />
      <input name="amount" value={form.amount} onChange={handleChange} placeholder="금액" required type="number" />
      <input name="date" value={form.date} onChange={handleChange} placeholder="날짜" required type="date" />
      <button type="submit">등록</button>
    </form>
  );
}

export default DividendForm;
