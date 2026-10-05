import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, renderHtml } from './collect.mjs';
import fixture from './fixture.json' with { type: 'json' };

test('collects supported adapters and preserves failed/unsupported states', () => {
  const report = collect(fixture);
  assert.equal(report.collection.length, 4);
  const byTicker = new Map(report.collection.map((row) => [row.ticker || row.companyName, row]));
  assert.equal(byTicker.get('069500').status, 'collected');
  assert.equal(byTicker.get('446720').status, 'collected');
  assert.equal(byTicker.get('0162Z0').status, 'failed');
  assert.equal(byTicker.get('999999').status, 'unsupported');
  assert.equal(byTicker.get('0162Z0').failureReason, 'source_timeout');
  assert.equal(byTicker.get('999999').failureReason, 'adapter_not_supported');
  assert.equal(report.forecasts.find((row) => row.ticker === '069500').estimatedAmount, 12000);
});

test('report keeps actual and forecast sections separate', () => {
  const report = collect(fixture);
  assert.equal(report.actualEntriesExcludedFromForecastStorage, true);
  const html = renderHtml(report);
  assert.match(html, /공식 공시 수집/);
  assert.match(html, /예측 \(사용자 입력 배당 이력 기반\)/);
  assert.match(html, /source_timeout/);
});

test('a missing official URL is a failed collection, not a guessed source', () => {
  const input = structuredClone(fixture);
  input.officialSources = [{ ticker: '069500', distributions: [{ payment_date: '2026-08-29', distribution_per_share: 120, currency: 'KRW' }] }];
  const row = collect(input).collection.find((item) => item.ticker === '069500');
  assert.equal(row.status, 'failed');
  assert.equal(row.failureReason, 'official_source_url_missing');
  assert.equal(row.sourceUrl, null);
});
