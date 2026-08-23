export const MATCH_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  MANUAL_REVIEW: 'manual_review',
  UNMATCHED: 'unmatched',
});

export function normalizeTickerInput(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isVerifiedMatch(match) {
  return match?.status === MATCH_STATUS.CONFIRMED
    && match?.confidence === 'high'
    && Boolean(normalizeTickerInput(match?.matched_ticker))
    && [
      match?.matched_company_name,
      match?.market,
      match?.sector,
      match?.industry,
      match?.evidence,
    ].every((value) => Boolean(String(value || '').trim()));
}

export function buildTickerMatchesMap(matches) {
  const matchMap = {};
  const blockedSourceKeys = new Set();

  (matches || []).forEach((match) => {
    const sourceKey = normalizeTickerInput(match?.source_input);
    if (!sourceKey) return;

    if (Object.prototype.hasOwnProperty.call(matchMap, sourceKey)) {
      matchMap[sourceKey] = null;
      blockedSourceKeys.add(sourceKey);
      return;
    }

    matchMap[sourceKey] = match;
  });

  Object.defineProperty(matchMap, '__blockedSourceKeys', {
    value: blockedSourceKeys,
    enumerable: false,
  });
  return matchMap;
}

export function getPortfolioDisplayName(row) {
  const companyName = String(row?.companyName ?? '').trim();
  if (row?.isConfirmed === true && companyName) return companyName;

  const sourceInput = String(row?.sourceInput ?? '').trim();
  const ticker = normalizeTickerInput(row?.ticker);
  const fallback = sourceInput || ticker;
  return fallback ? `${fallback} (확인 대기)` : '종목명 확인 대기';
}

function getBlockedSourceKeys(tickerMatchesMap) {
  return tickerMatchesMap?.__blockedSourceKeys instanceof Set
    ? tickerMatchesMap.__blockedSourceKeys
    : new Set();
}

export function getVerifiedMatchAliasKeys(tickerMatchesMap) {
  const aliasTickers = new Map();

  Object.entries(tickerMatchesMap).filter(([, match]) => isVerifiedMatch(match)).forEach(([sourceKey, match]) => {
    const matchedTicker = normalizeTickerInput(match.matched_ticker);
    [sourceKey, match.source_input, match.matched_company_name, match.matched_ticker].forEach((alias) => {
      const aliasKey = normalizeTickerInput(alias);
      if (!aliasKey) return;
      const tickers = aliasTickers.get(aliasKey) || new Set();
      tickers.add(matchedTicker);
      aliasTickers.set(aliasKey, tickers);
    });
  });

  const blockedSourceKeys = getBlockedSourceKeys(tickerMatchesMap);
  return new Set(
    [...aliasTickers.entries()]
      .filter(([aliasKey, tickers]) => tickers.size === 1 && !blockedSourceKeys.has(aliasKey))
      .map(([aliasKey]) => aliasKey)
  );
}

function getSourceInput(item) {
  return String(item.ticker || item.company_name || '').trim();
}

function getMatch(item, tickerMatchesMap) {
  const sourceKey = normalizeTickerInput(getSourceInput(item));
  const directMatch = tickerMatchesMap[sourceKey];
  if (directMatch && !isVerifiedMatch(directMatch)) return directMatch;

  const verifiedAliases = getVerifiedMatchAliasKeys(tickerMatchesMap);
  if (!verifiedAliases.has(sourceKey)) return null;

  const aliasMatches = Object.values(tickerMatchesMap).filter((match) => (
    isVerifiedMatch(match)
    && [match.source_input, match.matched_ticker, match.matched_company_name]
      .some((alias) => normalizeTickerInput(alias) === sourceKey)
  ));
  if (directMatch && isVerifiedMatch(directMatch) && !aliasMatches.includes(directMatch)) {
    aliasMatches.push(directMatch);
  }
  const matchedTickers = [...new Set(aliasMatches.map((match) => normalizeTickerInput(match.matched_ticker)).filter(Boolean))];
  return matchedTickers.length === 1 ? aliasMatches[0] : null;
}

export function resolveInstrument(item, tickerMatchesMap, tickersMap) {
  const sourceInput = getSourceInput(item);
  const sourceKey = normalizeTickerInput(sourceInput);
  const match = getMatch(item, tickerMatchesMap);
  const matchedTicker = normalizeTickerInput(match?.matched_ticker);
  const isConfirmed = isVerifiedMatch(match);
  const isBlocked = !isConfirmed;
  const resolvedTicker = isConfirmed ? matchedTicker : sourceKey || 'UNKNOWN';
  const metadata = isConfirmed ? tickersMap[resolvedTicker] || null : null;

  return {
    sourceInput,
    sourceKey,
    match,
    isConfirmed,
    isBlocked,
    resolvedTicker,
    metadata,
  };
}

export function buildPortfolioSummary({ data, tickerMatchesMap, tickersMap, exchangeRate }) {
  const tickerAggregates = new Map();

  data.forEach((item) => {
    const amount = (Number(item.dividend_amount) || 0) * (item.currency === 'USD' ? exchangeRate : 1);
    const resolution = resolveInstrument(item, tickerMatchesMap, tickersMap);
    const aggregationKey = resolution.isBlocked
      ? `unconfirmed:${resolution.sourceKey || 'UNKNOWN'}`
      : `instrument:${resolution.resolvedTicker}`;
    const current = tickerAggregates.get(aggregationKey) || {
      ticker: resolution.resolvedTicker,
      amount: 0,
      sourceInputs: new Set(),
      sourceCompanyNames: new Set(),
      resolution,
    };

    current.amount += amount;
    if (resolution.sourceInput) current.sourceInputs.add(resolution.sourceInput);
    if (item.company_name) current.sourceCompanyNames.add(item.company_name);
    tickerAggregates.set(aggregationKey, current);
  });

  const tableData = [...tickerAggregates.values()]
    .map(({ ticker, amount, sourceInputs, sourceCompanyNames, resolution }) => {
      const match = resolution.match;
      const metadata = resolution.metadata;
      const sector = resolution.isBlocked
        ? 'Unknown'
        : resolution.isConfirmed
          ? match?.sector || metadata?.sector || 'Unknown'
          : metadata?.sector || 'Unknown';
      const industry = resolution.isBlocked
        ? '-'
        : resolution.isConfirmed
          ? match?.industry || metadata?.industry || '-'
          : metadata?.industry || '-';
      const companyName = (resolution.isConfirmed && match?.matched_company_name)
        || metadata?.company_name_kr
        || [...sourceCompanyNames][0]
        || ticker;

      return {
        ticker,
        amount,
        companyName,
        isConfirmed: resolution.isConfirmed,
        sector,
        industry,
        market: resolution.isBlocked
          ? '-'
          : resolution.isConfirmed
            ? match?.market || metadata?.exchange || '-'
            : metadata?.exchange || '-',
        sourceInput: [...sourceInputs][0] || '',
        sourceInputs: [...sourceInputs],
        sourceCompanyNames: [...sourceCompanyNames],
        match,
        matchStatus: match?.status || null,
        confidence: match?.confidence || null,
        evidence: match?.evidence || null,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const sectorMap = tableData.reduce((result, row) => {
    result[row.sector] = (result[row.sector] || 0) + row.amount;
    return result;
  }, {});
  const categories = Object.keys(sectorMap).sort((a, b) => sectorMap[b] - sectorMap[a]);

  return {
    sectorChartData: {
      labels: categories,
      values: categories.map((category) => sectorMap[category]),
    },
    sectorTableData: tableData,
    unknownItems: tableData.filter((row) => row.sector === 'Unknown'),
  };
}
