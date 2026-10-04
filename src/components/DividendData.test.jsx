import { getDividendSourceLinks } from './DividendData';

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
