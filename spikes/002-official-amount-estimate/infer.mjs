#!/usr/bin/env node
/** Disposable spike: infer ETF units and estimate the next deposit. */
import fs from 'node:fs';

const dateOnly = (value) => {
  const text = String(value ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const iso = (date) => date.toISOString().slice(0, 10);
const money = (value) => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const tickerOf = (value) => String(value ?? '').trim().toUpperCase();
const numeric = (row, names) => names.map((name) => money(row?.[name])).find((value) => value !== null) ?? 0;
function subtractCalendarMonths(date, months) {
  const result = new Date(date); const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() - months);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last)); return result;
}

function resolveTicker(entry, matches) {
  const direct = tickerOf(entry.ticker);
  if (direct) return direct;
  const key = tickerOf(entry.company_name).replace(/\s+/g, '');
  const match = (matches ?? []).find((row) => row.status === 'confirmed' && row.confidence === 'high' && [row.source_input, row.matched_company_name].some((name) => tickerOf(name).replace(/\s+/g, '') === key));
  return tickerOf(match?.matched_ticker);
}

function officialDate(row) { return dateOnly(row.payment_date) || dateOnly(row.ex_date); }

export function estimate({ entries = [], distributions = [], matches = [], asOfDate, windowMonths = 3 }) {
  const asOf = dateOnly(asOfDate);
  if (!asOf || !Number.isInteger(windowMonths) || windowMonths < 1) throw new Error('asOfDate (YYYY-MM-DD) and a positive integer windowMonths are required');
  const start = subtractCalendarMonths(asOf, windowMonths);
  const scoped = entries.map((entry) => ({ entry, ticker: resolveTicker(entry, matches), date: dateOnly(entry.payment_date), amount: money(entry.dividend_amount), currency: entry.currency || null }))
    .filter((row) => row.ticker && row.date && row.date >= start && row.date <= asOf);
  const byTicker = new Map();
  for (const row of scoped) {
    const key = `${row.ticker}:${iso(row.date)}`;
    const prior = byTicker.get(key);
    if (prior && prior.amount !== row.amount) prior.conflict = true;
    else if (!prior) byTicker.set(key, { ...row, conflict: false });
  }
  const latest = new Map();
  for (const row of byTicker.values()) {
    const current = latest.get(row.ticker);
    if (!current || row.date > current.date) latest.set(row.ticker, row);
    else if (row.date.getTime() === current.date.getTime() && row.conflict) current.conflict = true;
  }
  const officialByTicker = new Map();
  for (const row of distributions) {
    const date = officialDate(row); const ticker = tickerOf(row.ticker); const amount = money(row.distribution_per_share);
    if (!ticker || !date || amount === null) continue;
    const list = officialByTicker.get(ticker) || []; list.push({ ...row, ticker, date, amount, currency: row.currency || null }); officialByTicker.set(ticker, list);
  }
  for (const list of officialByTicker.values()) list.sort((a, b) => a.date - b.date);
  const results = [];
  for (const [ticker, actual] of latest) {
    const list = officialByTicker.get(ticker) || [];
    const priorOfficial = [...list].reverse().find((row) => row.date <= actual.date);
    const nextOfficial = list.find((row) => row.date > actual.date);
    const reasons = [];
    if (actual.conflict) reasons.push('duplicate_actual_amounts_conflict');
    if (actual.amount === null) reasons.push('actual_amount_missing_or_invalid');
    if (!priorOfficial) reasons.push('prior_official_distribution_missing');
    else if (priorOfficial.amount <= 0) reasons.push('prior_distribution_zero_or_negative');
    if (!nextOfficial) reasons.push('next_official_distribution_missing');
    if (priorOfficial && nextOfficial && actual.currency && priorOfficial.currency && actual.currency !== priorOfficial.currency) reasons.push('prior_currency_mismatch');
    if (priorOfficial && nextOfficial && priorOfficial.currency && nextOfficial.currency && priorOfficial.currency !== nextOfficial.currency) reasons.push('distribution_currency_changed');
    const taxOrFee = numeric(actual.entry, ['tax_amount', 'withholding_tax', 'fee_amount', 'commission', 'withholding_amount']);
    if (taxOrFee > 0) reasons.push('actual_amount_includes_tax_or_fee');
    const canCalculate = reasons.length === 0;
    const units = canCalculate ? actual.amount / priorOfficial.amount : null;
    const estimatedAmount = canCalculate ? units * nextOfficial.amount : null;
    results.push({ ticker, actualPaymentDate: iso(actual.date), actualAmount: actual.amount, currency: actual.currency, priorOfficial: priorOfficial && { date: iso(priorOfficial.date), perShare: priorOfficial.amount, currency: priorOfficial.currency, sourceUrl: priorOfficial.source_url || null }, nextOfficial: nextOfficial && { date: iso(nextOfficial.date), perShare: nextOfficial.amount, currency: nextOfficial.currency, sourceUrl: nextOfficial.source_url || null }, inferredUnits: units, estimatedAmount, status: canCalculate ? 'estimated_with_assumptions' : 'cannot_calculate', reasons, assumptions: canCalculate ? ['입금액이 세전·수수료 차감 전 주당 분배금 기준이라고 가정', '직전 대비 보유량과 통화가 변하지 않는다고 가정'] : [] });
  }
  return { asOfDate: iso(asOf), periodStart: iso(start), windowMonths, results: results.sort((a, b) => a.ticker.localeCompare(b.ticker)), notFound: [...new Set(entries.map((entry) => resolveTicker(entry, matches)).filter(Boolean))].filter((ticker) => !latest.has(ticker)).sort() };
}

export function evaluateHistorical(cases = []) {
  const rows = cases.map((item) => {
    const actual = money(item.actualAmount); const prior = money(item.priorPerShare); const next = money(item.nextPerShare); const observed = money(item.observedAmount);
    const reasons = [];
    if (actual === null || prior === null || next === null || observed === null) reasons.push('historical_value_missing_or_invalid');
    if (prior !== null && prior <= 0) reasons.push('prior_distribution_zero_or_negative');
    if (item.actualCurrency && item.distributionCurrency && item.actualCurrency !== item.distributionCurrency) reasons.push('currency_mismatch');
    const predicted = reasons.length ? null : (actual / prior) * next;
    const absoluteError = predicted === null ? null : Math.abs(predicted - observed);
    const percentageError = predicted === null || observed === 0 ? null : (absoluteError / Math.abs(observed)) * 100;
    return { ticker: tickerOf(item.ticker), predictedAmount: predicted, observedAmount: observed, absoluteError, percentageError, reasons, status: reasons.length ? 'cannot_calculate' : 'evaluated' };
  });
  const valid = rows.filter((row) => row.absoluteError !== null);
  return { rows, evaluatedCount: valid.length, cannotCalculateCount: rows.length - valid.length, mae: valid.length ? valid.reduce((sum, row) => sum + row.absoluteError, 0) / valid.length : null, mape: valid.filter((row) => row.percentageError !== null).length ? valid.filter((row) => row.percentageError !== null).reduce((sum, row) => sum + row.percentageError, 0) / valid.filter((row) => row.percentageError !== null).length : null };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2] ?? 0, 'utf8'));
  const output = estimate(input);
  if (input.historicalCases) output.historicalMetrics = evaluateHistorical(input.historicalCases);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
