export async function searchTossInstruments(query, brand = '', signal) {
  const params = new URLSearchParams({ q: query });
  if (brand) params.set('brand', brand);
  const response = await fetch(`/api/toss-instruments?${params.toString()}`, { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '종목 검색에 실패했습니다.');
  return payload.items || [];
}
