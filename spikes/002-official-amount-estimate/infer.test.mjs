import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate, evaluateHistorical } from './infer.mjs';

const base = {
  asOfDate: '2026-08-31', windowMonths: 3,
  entries: [{ ticker: '069500', dividend_amount: 10000, payment_date: '2026-08-28', currency: 'KRW' }],
  distributions: [
    { ticker: '069500', payment_date: '2026-05-27', distribution_per_share: 100, currency: 'KRW' },
    { ticker: '069500', payment_date: '2026-09-27', distribution_per_share: 120, currency: 'KRW' },
  ],
};

test('infers units from prior per-share amount and estimates changed payout', () => {
  const row = estimate(base).results[0];
  assert.equal(row.status, 'estimated_with_assumptions');
  assert.equal(row.inferredUnits, 100);
  assert.equal(row.estimatedAmount, 12000);
  assert.equal(row.priorOfficial.perShare, 100);
  assert.equal(row.nextOfficial.perShare, 120);
});

test('does not calculate when tax/withholding is present', () => {
  const row = estimate({ ...base, entries: [{ ...base.entries[0], withholding_tax: 100 }] }).results[0];
  assert.equal(row.status, 'cannot_calculate');
  assert.ok(row.reasons.includes('actual_amount_includes_tax_or_fee'));
  assert.equal(row.estimatedAmount, null);
});

test('surfaces zero prior distribution and missing next distribution', () => {
  const row = estimate({ ...base, distributions: [{ ticker: '069500', payment_date: '2026-05-27', distribution_per_share: 0, currency: 'KRW' }] }).results[0];
  assert.equal(row.status, 'cannot_calculate');
  assert.deepEqual(row.reasons, ['prior_distribution_zero_or_negative', 'next_official_distribution_missing']);
});

test('rejects currency mismatch and conflicting duplicate actuals', () => {
  const row = estimate({ ...base, entries: [...base.entries, { ...base.entries[0], dividend_amount: 11000 }], distributions: base.distributions.map((item) => ({ ...item, currency: 'USD' })) }).results[0];
  assert.equal(row.status, 'cannot_calculate');
  assert.ok(row.reasons.includes('duplicate_actual_amounts_conflict'));
  assert.ok(row.reasons.includes('prior_currency_mismatch'));
});

test('uses only confirmed high-confidence match for missing ticker', () => {
  const row = estimate({ ...base, entries: [{ ticker: null, company_name: 'KODEX 200', dividend_amount: 10000, payment_date: '2026-08-28', currency: 'KRW' }], matches: [{ source_input: 'KODEX 200', matched_ticker: '069500', status: 'confirmed', confidence: 'high' }] }).results[0];
  assert.equal(row.ticker, '069500');
});

test('reports historical MAE/MAPE and cannot-calculate reasons', () => {
  const metrics = evaluateHistorical([
    { ticker: '069500', actualAmount: 10000, priorPerShare: 100, nextPerShare: 120, observedAmount: 11800, actualCurrency: 'KRW', distributionCurrency: 'KRW' },
    { ticker: 'ZERO01', actualAmount: 10000, priorPerShare: 0, nextPerShare: 100, observedAmount: 10000 },
  ]);
  assert.equal(metrics.evaluatedCount, 1);
  assert.equal(metrics.cannotCalculateCount, 1);
  assert.equal(metrics.mae, 200);
  assert.equal(metrics.mape, (200 / 11800) * 100);
  assert.ok(metrics.rows[1].reasons.includes('prior_distribution_zero_or_negative'));
});
