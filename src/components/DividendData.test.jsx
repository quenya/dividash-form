import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DividendData, { getCurrentMonthKey, getDividendSourceLinks, getMonthRange, shiftMonthKey } from './DividendData';
import { supabase } from '../api/supabaseClient';

jest.mock('../api/supabaseClient', () => ({ supabase: { from: jest.fn() } }));
afterEach(() => jest.restoreAllMocks());

function createQuery(result) {
  const query = {};
  ['select', 'order', 'range', 'gte', 'lt', 'or', 'ilike'].forEach((method) => {
    query[method] = jest.fn(() => query);
  });
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return query;
}

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test('provides official product links for requested ETFs without cache rows', () => {
  const links = getDividendSourceLinks();

  expect(links['RISE 코리아밸류업위클리고정커버드콜']).toBe('https://riseetf.co.kr/prod/finderDetail/44J2');
  expect(links['0094M0']).toBe('https://riseetf.co.kr/prod/finderDetail/44J2');
  expect(links['TIGER 배당커버드콜액티브']).toBe('https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002');
  expect(links['472150']).toBe('https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002');
});

test('links a newly appearing ETF from its official cache row by ticker', () => {
  const links = getDividendSourceLinks([
    { ticker: '123456', official_url: 'https://issuer.example/new-etf' },
  ]);

  expect(links['123456']).toBe('https://issuer.example/new-etf');
});

test('maps confirmed cache-backed aliases and does not use unconfirmed matches', () => {
  const links = getDividendSourceLinks(
    [{ ticker: '123456', official_url: 'https://issuer.example/product' }],
    [
      { source_input: 'source alias', matched_company_name: 'verified name', matched_ticker: '123456', status: 'confirmed', confidence: 'high' },
      { source_input: 'review alias', matched_company_name: 'review name', matched_ticker: '123456', status: 'manual_review', confidence: 'high' },
    ],
  );

  expect(links['SOURCE ALIAS']).toBe('https://issuer.example/product');
  expect(links['VERIFIED NAME']).toBe('https://issuer.example/product');
  expect(links['REVIEW ALIAS']).toBeUndefined();
});

test('scopes the default all-rows view to the current month', async () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const dividendQuery = createQuery({
    data: [{ id: 'entry-1', account_name: '계좌', company_name: 'ETF', dividend_amount: 100, currency: 'KRW', payment_date: monthStart }],
    count: 1,
    error: null,
  });
  const cacheQuery = createQuery({ data: [], error: null });
  const matchesQuery = createQuery({ data: [], error: null });
  supabase.from.mockImplementation((table) => ({
    dividend_entries: dividendQuery,
    etf_product_cache: cacheQuery,
    ticker_matches: matchesQuery,
  }[table]));

  render(<DividendData />);

  await waitFor(() => expect(dividendQuery.gte).toHaveBeenCalledWith('payment_date', monthStart));
  await screen.findByText('계좌');
  expect(dividendQuery.lt).toHaveBeenCalledWith('payment_date', nextMonthStart);
  expect(dividendQuery.range).toHaveBeenCalledWith(0, 499);
  expect(screen.getByLabelText('페이지당 표시')).toHaveValue('all');
  expect(screen.getByText((_, element) => element.tagName === 'SPAN' && element.textContent.replace(/\s/g, '') === '총1건중1-1표시')).toBeInTheDocument();
});

test('loads all rows in batches when the month exceeds the first server page', async () => {
  const allRows = Array.from({ length: 501 }, (_, index) => ({
    id: `entry-${index}`,
    account_name: `계좌 ${index}`,
    company_name: 'ETF',
    dividend_amount: 100,
    currency: 'KRW',
    payment_date: '2026-11-01',
  }));
  const dividendQueries = [];
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') {
      const offset = dividendQueries.length === 0 ? 0 : 500;
      const query = createQuery({ data: allRows.slice(offset, offset + 500), count: allRows.length, error: null });
      dividendQueries.push(query);
      return query;
    }
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);

  await screen.findByText('계좌 500');
  expect(dividendQueries).toHaveLength(2);
  expect(dividendQueries[0].range).toHaveBeenCalledWith(0, 499);
  expect(dividendQueries[1].range).toHaveBeenCalledWith(500, 999);
  expect(dividendQueries[0].order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
  expect(dividendQueries[1].order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
  expect(screen.getAllByRole('row')).toHaveLength(502);
});

test('calculates month boundaries and shifts across year boundaries', () => {
  expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
  expect(getMonthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
});

test('navigates to the previous and next month and queries each month separately', async () => {
  const dividendQueries = [];
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') {
      const query = createQuery({ data: [], count: 0, error: null });
      dividendQueries.push(query);
      return query;
    }
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);
  await screen.findByText('등록된 배당 데이터가 없습니다.');

  const currentMonth = getCurrentMonthKey();
  const previousMonth = shiftMonthKey(currentMonth, -1);
  const previousRange = getMonthRange(previousMonth);
  fireEvent.click(screen.getByRole('button', { name: '지난달' }));
  await waitFor(() => expect(dividendQueries[1].gte).toHaveBeenCalledWith('payment_date', previousRange.start));
  expect(screen.getByText(`${Number(previousMonth.slice(0, 4))}년 ${Number(previousMonth.slice(5))}월`)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: '다음달' })).not.toBeDisabled());

  const currentRange = getMonthRange(currentMonth);
  fireEvent.click(screen.getByRole('button', { name: '다음달' }));
  await waitFor(() => expect(dividendQueries[2].gte).toHaveBeenCalledWith('payment_date', currentRange.start));
  expect(dividendQueries[2].lt).toHaveBeenCalledWith('payment_date', currentRange.end);
});

test('ignores a late response from an older sort query', async () => {
  const requests = [];
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') {
      const deferred = createDeferred();
      requests.push(deferred);
      return createQuery(deferred.promise);
    }
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);
  await waitFor(() => expect(requests).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: /금액/ }));
  await waitFor(() => expect(requests).toHaveLength(2));

  const paymentDate = `${getCurrentMonthKey()}-01`;
  await act(async () => {
    requests[1].resolve({ data: [{ id: 'new', account_name: '최신 계좌', company_name: '최신 ETF', dividend_amount: 200, currency: 'KRW', payment_date: paymentDate }], count: 1, error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await screen.findByText('최신 ETF');

  await act(async () => {
    requests[0].resolve({ data: [{ id: 'old', account_name: '이전 계좌', company_name: '이전 ETF', dividend_amount: 100, currency: 'KRW', payment_date: paymentDate }], count: 1, error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByText('최신 ETF')).toBeInTheDocument();
  expect(screen.queryByText('이전 ETF')).not.toBeInTheDocument();
});

test('shows rejected query errors and re-enables month navigation', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') return createQuery(Promise.reject(new Error('일시적 네트워크 오류')));
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);

  expect(await screen.findByText('일시적 네트워크 오류')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '지난달' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: '다음달' })).not.toBeDisabled();
});

test('preserves dividend rows when the official-link lookup rejects', async () => {
  const dividendQuery = createQuery({
    data: [{ id: 'entry-metadata', account_name: '계좌 metadata', company_name: '출처 ETF', dividend_amount: 100, currency: 'KRW', payment_date: `${getCurrentMonthKey()}-01` }],
    count: 1,
    error: null,
  });
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') return dividendQuery;
    if (table === 'etf_product_cache') return createQuery(Promise.reject(new Error('cache unavailable')));
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);

  expect(await screen.findByText('계좌 metadata')).toBeInTheDocument();
  expect(screen.getByText('공식 ETF 출처 링크 정보를 불러오지 못했습니다. 배당 데이터는 표시됩니다.')).toBeInTheDocument();
});

test('retains selectable paging when a numeric page size is chosen', async () => {
  const dividendQueries = [];
  supabase.from.mockImplementation((table) => {
    if (table === 'dividend_entries') {
      const data = Array.from({ length: 21 }, (_, index) => ({ id: `entry-${index}`, account_name: `계좌 ${index}`, company_name: 'ETF', dividend_amount: 100, currency: 'KRW', payment_date: '2026-11-01' }));
      const query = createQuery({ data, count: 21, error: null });
      dividendQueries.push(query);
      return query;
    }
    return createQuery({ data: [], error: null });
  });

  render(<DividendData />);
  await screen.findByText('계좌 0');
  expect(dividendQueries[0].range).toHaveBeenCalledWith(0, 499);

  fireEvent.change(screen.getByLabelText('페이지당 표시'), { target: { value: '10' } });
  await waitFor(() => expect(dividendQueries[1].range).toHaveBeenCalledWith(0, 9));
  await waitFor(() => expect(screen.getByRole('button', { name: '다음' })).not.toBeDisabled());

  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(dividendQueries[2].range).toHaveBeenCalledWith(10, 19));
});
