import { getOfficialSyncWarning } from './officialSyncStatus';

describe('getOfficialSyncWarning', () => {
  const now = new Date('2026-10-17T12:00:00Z');

  test('warns when no operational run status is available', () => {
    expect(getOfficialSyncWarning(null, now)).toMatch(/상태를 확인할 수 없습니다/);
  });

  test('does not warn for a recent complete run without coverage gaps', () => {
    expect(getOfficialSyncWarning({ status: 'success', finished_at: '2026-10-17T00:00:00Z', has_coverage_gaps: false }, now)).toBeNull();
  });

  test('warns on a failed or partial run and does not imply no scheduled payment', () => {
    expect(getOfficialSyncWarning({ status: 'failure', finished_at: '2026-10-17T00:00:00Z' }, now)).toMatch(/실패/);
    expect(getOfficialSyncWarning({ status: 'partial_failure', finished_at: '2026-10-17T00:00:00Z', has_coverage_gaps: true }, now)).toMatch(/확인이 필요한 종목/);
  });

  test('warns when the latest successful sync is older than 36 hours', () => {
    expect(getOfficialSyncWarning({ status: 'success', finished_at: '2026-10-15T23:59:00Z', has_coverage_gaps: false }, now)).toMatch(/오래되었습니다/);
  });
});
