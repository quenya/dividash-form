const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = fs.readFileSync(path.join(__dirname, 'ticker_matching.sql'), 'utf8');
const coverageMigration = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/202610270001_official_etf_sync_coverage.sql'),
  'utf8',
);
const matchSeedBlock = sql.slice(sql.indexOf('CREATE TEMP TABLE ticker_matching_verified_seed'));

test('ticker seed reruns update only migration-owned rows', () => {
  assert.match(matchSeedBlock, /ON CONFLICT \(source_input\) DO UPDATE/);
  assert.match(matchSeedBlock, /WHERE public\.ticker_matches\.managed_by = 'migration_seed'/);
  assert.doesNotMatch(matchSeedBlock, /ON CONFLICT \(source_input\) DO NOTHING/);
});

test('authenticated users cannot mutate migration-owned rows', () => {
  assert.match(
    sql,
    /CREATE POLICY "ticker_matches_update_user"[\s\S]*?USING \([\s\S]*?managed_by = 'user'[\s\S]*?\)[\s\S]*?WITH CHECK \([\s\S]*?managed_by = 'user'/,
  );
});

test('verified official sync products have catalog and alias seeds', () => {
  for (const tuple of [
    /\('284430', 'KODEX 200미국채혼합50', 'KRX', 'ETF', '미국채혼합'\)/,
    /\('0094M0', 'RISE 코리아밸류업위클리고정커버드콜', 'KRX', 'ETF', '커버드콜'\)/,
    /\('284430', '284430', 'KODEX 200미국채혼합50', 'KRX', 'ETF', '미국채혼합', 'confirmed', 'high'/,
    /\('KODEX 200미국채혼합50', '284430', 'KODEX 200미국채혼합50', 'KRX', 'ETF', '미국채혼합', 'confirmed', 'high'/,
    /\('0094M0', '0094M0', 'RISE 코리아밸류업위클리고정커버드콜', 'KRX', 'ETF', '커버드콜', 'confirmed', 'high'/,
    /\('RISE 코리아밸류업위클리고정커버드콜', '0094M0', 'RISE 코리아밸류업위클리고정커버드콜', 'KRX', 'ETF', '커버드콜', 'confirmed', 'high'/,
  ]) {
    assert.match(sql, tuple);
  }
});

test('live sync coverage migration seeds verified public mappings only', () => {
  for (const value of [
    "'284430', 'KODEX 200미국채혼합50'",
    "'0094M0', 'RISE 코리아밸류업위클리고정커버드콜'",
    "'472150', 'TIGER 배당커버드콜액티브'",
    "'KODEX 200미국채혼합50', '284430'",
    "'RISE 코리아밸류업위클리고정커버드콜', '0094M0'",
    "'TIGER 배당커버드콜액티브', '472150'",
    'https://www.samsungfund.com/etf/product/view.do?id=2ETF99',
  ]) {
    assert.ok(coverageMigration.includes(value), `missing expected migration value: ${value}`);
  }
  assert.match(coverageMigration, /WHERE public\.ticker_matches\.managed_by = 'migration_seed'/);
  assert.doesNotMatch(coverageMigration, /INSERT INTO public\.dividend_entries|UPDATE public\.dividend_entries|DELETE FROM public\.dividend_entries/);
  assert.doesNotMatch(coverageMigration, /INSERT INTO public\.etf_distribution_history|UPDATE public\.etf_distribution_history|DELETE FROM public\.etf_distribution_history/);
});

test('legacy upgrades add the columns used by later migration statements', () => {
  for (const column of ['matched_ticker', 'matched_company_name', 'market', 'sector', 'industry', 'status', 'confidence', 'evidence', 'managed_by']) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${column} `));
  }
  assert.match(sql, /requires the existing source_input key column/);
});
