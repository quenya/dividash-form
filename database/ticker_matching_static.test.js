const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = fs.readFileSync(path.join(__dirname, 'ticker_matching.sql'), 'utf8');
const matchSeedBlock = sql.slice(sql.indexOf('CREATE TEMP TABLE ticker_matching_verified_seed'));

test('ticker seed reruns update only migration-owned rows', () => {
  assert.match(matchSeedBlock, /ON CONFLICT \(source_input\) DO UPDATE/);
  assert.match(matchSeedBlock, /WHERE public\.ticker_matches\.managed_by = 'migration_seed'/);
  assert.doesNotMatch(matchSeedBlock, /ON CONFLICT \(source_input\) DO NOTHING/);
});

test('authenticated users cannot mutate migration-owned rows', () => {
  assert.match(
    sql,
    /CREATE POLICY "Enable update for authenticated users"[\s\S]*?USING \([\s\S]*?managed_by = 'user'[\s\S]*?\)[\s\S]*?WITH CHECK \([\s\S]*?managed_by = 'user'/,
  );
});

test('legacy upgrades add the columns used by later migration statements', () => {
  for (const column of ['matched_ticker', 'matched_company_name', 'market', 'sector', 'industry', 'status', 'confidence', 'evidence', 'managed_by']) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${column} `));
  }
  assert.match(sql, /requires the existing source_input key column/);
});
