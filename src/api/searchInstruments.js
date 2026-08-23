export async function searchTossInstruments(query, signal) {
  const response = await fetch(`/api/toss-instruments?q=${encodeURIComponent(query)}`, { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '종목 검색에 실패했습니다.');
  return payload.items || [];
}
