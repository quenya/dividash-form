import test from 'node:test';
import assert from 'node:assert/strict';
import { discover } from './discover.mjs';

const instruments = [
  { symbol: '069500', name: 'KODEX 200', security_type: 'ETF' },
  { symbol: '0162Z0', name: 'RISE 삼성전자SK하이닉스채권혼합', security_type: '상장지수펀드' },
  { symbol: '123456', name: '일반 주식', security_type: 'STOCK' },
];

test('uses the explicit as-of date and a three-month inclusive calendar window', () => {
  const result = discover({
    asOfDate: '2026-08-28', entries: [
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-05-30' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-05-28' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-08-28' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: '2026-08-29' },
    ], instruments,
  });
  assert.equal(result.periodStart, '2026-05-28');
  assert.deepEqual(result.candidates[0].paymentDates, ['2026-05-28', '2026-05-30', '2026-08-28']);
  assert.equal(result.candidates[0].entryCount, 3, 'same ticker/date duplicates are removed');
});

test('resolves only confirmed/high matches and verifies instrument ETF status', () => {
  const result = discover({
    asOfDate: '2026-08-28', entries: [
      { ticker: null, company_name: 'RISE 삼성전자SK하이닉스채권혼합', payment_date: '2026-08-04' },
      { ticker: null, company_name: 'LOW confidence', payment_date: '2026-08-04' },
      { ticker: '123456', company_name: '일반 주식', payment_date: '2026-08-04' },
    ], instruments,
    matches: [
      { source_input: 'RISE 삼성전자SK하이닉스채권혼합', matched_ticker: '0162Z0', status: 'confirmed', confidence: 'high' },
      { source_input: 'LOW confidence', matched_ticker: '069500', status: 'confirmed', confidence: 'medium' },
    ],
  });
  assert.deepEqual(result.candidates.map(({ ticker }) => ticker), ['0162Z0']);
  assert.deepEqual(result.unsupported.map(({ reason }) => reason), ['not_etf', 'missing_or_unmatched_ticker']);
});

test('reports missing instruments, invalid dates, and invalid as-of input', () => {
  const result = discover({
    asOfDate: '2026-08-28', entries: [
      { ticker: '999999', company_name: 'Unknown', payment_date: '2026-08-01' },
      { ticker: '069500', company_name: 'KODEX 200', payment_date: 'not-a-date' },
    ], instruments,
  });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.unsupported[0].reason, 'instrument_not_found');
  assert.throws(() => discover({ asOfDate: 'bad', entries: [] }), /asOfDate/);
});
