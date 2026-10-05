#!/usr/bin/env node
/**
 * Disposable spike: discover unique ETF tickers with dividend entries in
 * the inclusive calendar window [asOfDate - N months, asOfDate].
 */

import fs from 'node:fs';

const TICKER_RE = /^[A-Z0-9]{6}$/;

function normalize(value) {
  return String(value ?? '').trim().toUpperCase();
}

function dateOnly(value) {
  const text = String(value ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function subtractCalendarMonths(date, months) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function isEtf(row) {
  const type = String(row?.security_type ?? row?.securityType ?? '').trim();
  return /(^|\s)ETF(\s|$)/i.test(type) || type.includes('상장지수');
}

function verifiedMatch(row) {
  return row?.status === 'confirmed' && row?.confidence === 'high' && TICKER_RE.test(normalize(row?.matched_ticker));
}

function buildMatchMap(matches) {
  const map = new Map();
  for (const row of matches ?? []) {
    if (!verifiedMatch(row)) continue;
    const ticker = normalize(row.matched_ticker);
    for (const alias of [row.source_input, row.matched_company_name]) {
      const key = normalize(alias).replace(/\s+/g, '');
      if (key) map.set(key, ticker);
    }
  }
  return map;
}

export function discover({ entries = [], instruments = [], matches = [], asOfDate, windowMonths = 3 }) {
  const asOf = dateOnly(asOfDate);
  if (!asOf || !Number.isInteger(windowMonths) || windowMonths < 1) {
    throw new Error('asOfDate (YYYY-MM-DD) and a positive integer windowMonths are required');
  }
  const start = subtractCalendarMonths(asOf, windowMonths);
  const instrumentMap = new Map((instruments ?? []).map((row) => [normalize(row.symbol ?? row.ticker), row]));
  const matchMap = buildMatchMap(matches);
  const candidates = new Map();
  const unsupported = [];
  const seenUnsupported = new Set();

  for (const entry of entries ?? []) {
    const paymentDate = dateOnly(entry.payment_date);
    if (!paymentDate || paymentDate < start || paymentDate > asOf) continue;
    const source = normalize(entry.ticker) || normalize(entry.company_name).replace(/\s+/g, '');
    const ticker = TICKER_RE.test(normalize(entry.ticker))
      ? normalize(entry.ticker)
      : matchMap.get(source);
    const instrument = instrumentMap.get(ticker);
    let reason = null;
    if (!ticker) reason = 'missing_or_unmatched_ticker';
    else if (!instrument) reason = 'instrument_not_found';
    else if (!isEtf(instrument)) reason = 'not_etf';
    if (reason) {
      const key = `${source}:${isoDate(paymentDate)}:${reason}`;
      if (!seenUnsupported.has(key)) {
        seenUnsupported.add(key);
        unsupported.push({ sourceInput: entry.ticker || entry.company_name || '', paymentDate: isoDate(paymentDate), reason });
      }
      continue;
    }
    const current = candidates.get(ticker) ?? {
      ticker, companyName: instrument.name ?? entry.company_name ?? ticker,
      paymentDates: new Set(), entryCount: 0, instrument,
    };
    const entryKey = isoDate(paymentDate);
    if (!current.paymentDates.has(entryKey)) {
      current.paymentDates.add(entryKey);
      current.entryCount += 1;
    }
    candidates.set(ticker, current);
  }

  return {
    asOfDate: isoDate(asOf), periodStart: isoDate(start), windowMonths,
    candidates: [...candidates.values()].map((row) => ({ ...row, paymentDates: [...row.paymentDates].sort() })).sort((a, b) => a.ticker.localeCompare(b.ticker)),
    unsupported: unsupported.sort((a, b) => `${a.sourceInput}${a.paymentDate}`.localeCompare(`${b.sourceInput}${b.paymentDate}`)),
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2] ?? 0, 'utf8'));
  process.stdout.write(`${JSON.stringify(discover(input), null, 2)}\n`);
}
