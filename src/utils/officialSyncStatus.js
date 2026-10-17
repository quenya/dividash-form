const MAX_SYNC_AGE_MS = 36 * 60 * 60 * 1000;

export function getOfficialSyncWarning(status, now = new Date()) {
    if (!status || !status.finished_at) {
        return '공식 분배금 동기화 상태를 확인할 수 없습니다. 예정 일정이 누락됐을 수 있습니다.';
    }

    const finishedAt = new Date(status.finished_at);
    if (!Number.isFinite(finishedAt.getTime())) {
        return '공식 분배금 동기화 상태를 확인할 수 없습니다. 예정 일정이 누락됐을 수 있습니다.';
    }

    if (status.status === 'failure') {
        return '최근 공식 분배금 동기화가 실패했습니다. 일정이 없다고 단정할 수 없습니다.';
    }
    if (status.status === 'partial_failure') {
        return status.has_coverage_gaps
            ? '확인이 필요한 종목이 있어 일부 ETF의 공식 분배 일정이 누락됐을 수 있습니다.'
            : '일부 공식 분배금 동기화에 실패했습니다. 일정이 누락됐을 수 있습니다.';
    }
    if (status.status !== 'success') {
        return '공식 분배금 동기화가 완료되지 않았습니다. 예정 일정이 누락됐을 수 있습니다.';
    }
    if (status.has_coverage_gaps) {
        return '일부 ETF는 공식 페이지 매핑 확인이 필요해 예정 일정에 누락됐을 수 있습니다.';
    }

    const age = now.getTime() - finishedAt.getTime();
    if (age < 0 || age > MAX_SYNC_AGE_MS) {
        return '공식 분배금 동기화가 오래되었습니다. 최신 예정 일정이 반영되지 않았을 수 있습니다.';
    }
    return null;
}
