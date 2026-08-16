export const MATCH_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  MANUAL_REVIEW: 'manual_review',
  UNMATCHED: 'unmatched',
});

export function normalizeTickerInput(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function getSourceInput(item) {
  return String(item.ticker || item.company_name || '').trim();
}

function getMatch(item, tickerMatchesMap) {
  const sourceKey = normalizeTickerInput(getSourceInput(item));
  const directMatch = tickerMatchesMap[sourceKey];
  if (directMatch) return directMatch;

  const aliasMatches = Object.values(tickerMatchesMap).filter((match) => (
    match.status === MATCH_STATUS.CONFIRMED
    && [match.matched_ticker, match.matched_company_name]
      .some((alias) => normalizeTickerInput(alias) === sourceKey)
  ));
  const matchedTickers = [...new Set(aliasMatches.map((match) => normalizeTickerInput(match.matched_ticker)).filter(Boolean))];
  return matchedTickers.length === 1 ? aliasMatches[0] : null;
}

export function resolveInstrument(item, tickerMatchesMap, tickersMap) {
  const sourceInput = getSourceInput(item);
  const sourceKey = normalizeTickerInput(sourceInput);
  const match = getMatch(item, tickerMatchesMap);
  const matchedTicker = normalizeTickerInput(match?.matched_ticker);
  const hasVerifiedDetails = [
    match?.matched_company_name,
    match?.market,
    match?.sector,
    match?.industry,
    match?.evidence,
  ].every((value) => Boolean(String(value || '').trim()));
  const isConfirmed = match?.status === MATCH_STATUS.CONFIRMED
    && match?.confidence === 'high'
    && Boolean(matchedTicker)
    && hasVerifiedDetails;
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
