#!/usr/bin/env node
/** Disposable spike: collect official disclosures and render a forecast report. */
import fs from 'node:fs';
import path from 'node:path';
import { discover } from '../001-recent-ticker-discovery/discover.mjs';
import { estimate } from '../002-official-amount-estimate/infer.mjs';

const normalize = (value) => String(value ?? '').trim().toUpperCase();
const adapterFor = (instrument = {}) => normalize(instrument.adapter || instrument.provider);

const ADAPTERS = new Set(['KODEX', 'SOL', 'RISE']);

export function collect(input) {
  const discovery = discover(input);
  const instrumentByTicker = new Map((input.instruments ?? []).map((row) => [normalize(row.symbol ?? row.ticker), row]));
  const sourceByTicker = new Map((input.officialSources ?? []).map((row) => [normalize(row.ticker), row]));
  const collection = [];

  for (const candidate of discovery.candidates) {
    const instrument = instrumentByTicker.get(candidate.ticker) ?? {};
    const adapter = adapterFor(instrument);
    const source = sourceByTicker.get(candidate.ticker);
    let status = 'unsupported';
    let failureReason = null;
    let sourceUrl = source?.sourceUrl ?? instrument.officialUrl ?? null;
    if (!ADAPTERS.has(adapter)) {
      failureReason = 'adapter_not_supported';
    } else if (!sourceUrl) {
      status = 'failed';
      failureReason = 'official_source_url_missing';
    } else if (source?.status === 'failed') {
      status = 'failed';
      failureReason = source.failureReason || 'official_source_fetch_failed';
    } else if (!Array.isArray(source?.distributions) || source.distributions.length === 0) {
      status = 'failed';
      failureReason = 'official_disclosures_empty';
    } else {
      status = 'collected';
    }
    collection.push({ ticker: candidate.ticker, companyName: candidate.companyName, adapter: adapter || null, status, sourceUrl, failureReason, disclosureCount: Array.isArray(source?.distributions) ? source.distributions.length : 0 });
  }
  for (const item of discovery.unsupported) collection.push({ ticker: null, companyName: item.sourceInput, adapter: null, status: 'unsupported', sourceUrl: null, failureReason: item.reason, disclosureCount: 0, paymentDate: item.paymentDate });

  const distributions = [...(input.distributions ?? [])];
  for (const source of input.officialSources ?? []) distributions.push(...(source.distributions ?? []).map((row) => ({ ...row, ticker: row.ticker ?? source.ticker, source_url: row.source_url ?? source.sourceUrl })));
  const forecast = estimate({ ...input, distributions });
  const byTicker = new Map(collection.filter((row) => row.ticker).map((row) => [row.ticker, row]));
  const forecasts = forecast.results.map((row) => ({ ...row, collectionStatus: byTicker.get(row.ticker)?.status ?? 'not_collected', officialSourceUrl: byTicker.get(row.ticker)?.sourceUrl ?? null }));
  return { generatedAt: new Date().toISOString(), asOfDate: discovery.asOfDate, periodStart: discovery.periodStart, windowMonths: discovery.windowMonths, collection, forecasts, actualEntriesExcludedFromForecastStorage: true };
}

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
export function renderHtml(report) {
  const rows = report.collection.map((row) => `<tr><td>${escapeHtml(row.ticker || row.companyName)}</td><td>${escapeHtml(row.adapter || '—')}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.sourceUrl || '—')}</td><td>${escapeHtml(row.failureReason || '—')}</td></tr>`).join('');
  const forecasts = report.forecasts.map((row) => `<tr><td>${escapeHtml(row.ticker)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.actualPaymentDate)}</td><td>${row.estimatedAmount ?? '—'}</td><td>${escapeHtml(row.nextOfficial?.date || '—')}</td><td>${escapeHtml(row.reasons.join(', ') || '—')}</td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dividend forecast ${escapeHtml(report.asOfDate)}</title><style>body{font:14px system-ui;margin:1rem;color:#222}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ddd;padding:.45rem;text-align:left}th{background:#f3f4f6}.ok{color:#087f5b}</style><h1>배당 예측 보고서</h1><p>기준일 ${escapeHtml(report.asOfDate)} · 기간 시작 ${escapeHtml(report.periodStart)} · 실제 배당 이력과 분리된 참고용 예측</p><h2>공식 공시 수집</h2><table><thead><tr><th>티커/종목</th><th>어댑터</th><th>상태</th><th>공식 출처</th><th>실패/미지원 사유</th></tr></thead><tbody>${rows}</tbody></table><h2>예측 (사용자 입력 배당 이력 기반)</h2><table><thead><tr><th>티커</th><th>상태</th><th>최근 입금일</th><th>추정 예정 입금액</th><th>예정 지급일</th><th>계산 불가 사유</th></tr></thead><tbody>${forecasts}</tbody></table><p>주의: 이 보고서는 dividend_entries를 변경하지 않으며, 공식 분배금은 참고 입력입니다.</p>`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2] ?? 0, 'utf8'));
  const outputDir = process.argv[3] || path.dirname(process.argv[2] || '.');
  const report = collect(input);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'report.html'), renderHtml(report));
  process.stdout.write(`${JSON.stringify({ outputDir, collectionCount: report.collection.length, forecastCount: report.forecasts.length })}\n`);
}
