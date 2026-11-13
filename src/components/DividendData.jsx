import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../api/supabaseClient";

const PAGE_SIZE_OPTIONS = ["all", 10, 25, 50];
const ALL_ROWS_BATCH_SIZE = 500;
const ETF_BRANDS = ["전체", "KODEX", "RISE", "SOL", "TIGER", "ACE", "HANARO", "KOSEF", "PLUS", "TIMEFOLIO"];
const WON_SYMBOL = String.fromCharCode(0x20A9);

export function getCurrentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthRange(monthKey) {
  return {
    start: `${monthKey}-01`,
    end: `${shiftMonthKey(monthKey, 1)}-01`,
  };
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

async function fetchAllMonthRows(buildQuery, initialRows, count) {
  if (typeof count !== "number") throw new Error("전체 배당 건수를 확인할 수 없습니다.");
  const allRows = [...(initialRows || [])];
  while (allRows.length < count) {
    const offset = allRows.length;
    const { data, error } = await buildQuery().range(offset, offset + ALL_ROWS_BATCH_SIZE - 1);
    if (error) throw error;
    if (!data?.length) throw new Error("배당 데이터를 모두 불러오지 못했습니다.");
    allRows.push(...data);
  }
  return allRows;
}

function settleMetadataQuery(query) {
  return Promise.resolve(query).catch((error) => ({ data: [], error }));
}
const OFFICIAL_PRODUCT_LINKS = {
  "0094M0": "https://riseetf.co.kr/prod/finderDetail/44J2",
  "RISE 코리아밸류업위클리고정커버드콜": "https://riseetf.co.kr/prod/finderDetail/44J2",
  "472150": "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002",
  "TIGER 배당커버드콜액티브": "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002",
};

export function getDividendSourceLinks(cache = [], matches = []) {
  const links = {};
  cache.forEach((item) => {
    if (item.official_url) links[String(item.ticker).trim().toUpperCase()] = item.official_url;
  });
  matches.forEach((match) => {
    if (match.status !== "confirmed" || match.confidence !== "high") return;
    const url = links[String(match.matched_ticker || "").trim().toUpperCase()];
    if (url) {
      links[String(match.source_input || "").trim().toUpperCase()] = url;
      links[String(match.matched_company_name || "").trim().toUpperCase()] = url;
    }
  });
  Object.entries(OFFICIAL_PRODUCT_LINKS).forEach(([key, url]) => {
    links[key.toUpperCase()] = url;
  });
  return links;
}

function formatAmount(amount, currency) {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(numeric)) return "-";

  let symbol = "";
  if (currency === "KRW") symbol = WON_SYMBOL;
  else if (currency === "USD") symbol = "$";
  else if (currency) symbol = currency;

  return `${symbol ? `${symbol} ` : ""}${numeric.toLocaleString()}`;
}

function DividendData() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthKey());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceLinks, setSourceLinks] = useState({});
  const [sort, setSort] = useState({ key: "payment_date", ascending: false });
  const [searchInput, setSearchInput] = useState("");
  const [brandInput, setBrandInput] = useState("전체");
  const [filters, setFilters] = useState({ search: "", brand: "전체" });

  const totalPages = useMemo(() => {
    if (!totalCount || pageSize === "all") return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const buildDividendQuery = () => {
      const { start: monthStart, end: nextMonthStart } = getMonthRange(selectedMonth);
      let query = supabase.from("dividend_entries").select("*", { count: "exact" });
      query = query.gte("payment_date", monthStart).lt("payment_date", nextMonthStart);
      if (filters.search.trim()) {
        const term = filters.search.trim().replace(/[%(),]/g, " ");
        query = query.or(`company_name.ilike.%${term}%,account_name.ilike.%${term}%`);
      }
      if (filters.brand !== "전체") query = query.ilike("company_name", `${filters.brand}%`);
      return query
        .order(sort.key, { ascending: sort.ascending, nullsFirst: false })
        .order("id", { ascending: true });
    };

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      const from = pageSize === "all" ? 0 : (page - 1) * pageSize;
      const to = pageSize === "all" ? ALL_ROWS_BATCH_SIZE - 1 : from + pageSize - 1;

      try {
        const [{ data, count, error: queryError }, { data: cache, error: cacheError }, { data: matches, error: matchesError }] = await Promise.all([
          buildDividendQuery().range(from, to),
          settleMetadataQuery(supabase.from("etf_product_cache").select("ticker,official_url")),
          settleMetadataQuery(supabase.from("ticker_matches").select("source_input,matched_company_name,matched_ticker,status,confidence")),
        ]);
        if (cancelled) return;

        if (queryError) {
          console.error("배당 데이터 조회 오류:", queryError);
          setError(queryError.message || "데이터를 불러오지 못했습니다.");
          setRows([]);
          setTotalCount(0);
          setSourceLinks({});
          return;
        }

        const visibleRows = pageSize === "all"
          ? await fetchAllMonthRows(buildDividendQuery, data, count)
          : (data || []);
        if (cancelled) return;

        setRows(visibleRows);
        setTotalCount(typeof count === "number" ? count : 0);
        setSourceLinks(getDividendSourceLinks(cache || [], matches || []));
        if (cacheError || matchesError) {
          setError("공식 ETF 출처 링크 정보를 불러오지 못했습니다. 배당 데이터는 표시됩니다.");
        }
      } catch (fetchError) {
        if (!cancelled) {
          console.error("배당 데이터 조회 오류:", fetchError);
          setError(fetchError.message || "데이터를 불러오지 못했습니다.");
          setRows([]);
          setTotalCount(0);
          setSourceLinks({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, selectedMonth, sort, filters]);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters({ search: searchInput, brand: brandInput });
  };

  const clearFilters = () => {
    setSearchInput("");
    setBrandInput("전체");
    setFilters({ search: "", brand: "전체" });
    setPage(1);
  };

  const handleMonthChange = (offset) => {
    setPage(1);
    setSelectedMonth((current) => shiftMonthKey(current, offset));
  };

  const handleSort = (key) => {
    setPage(1);
    setSort((current) => (current.key === key
      ? { key, ascending: !current.ascending }
      : { key, ascending: true }));
  };

  const sortIndicator = (key) => sort.key === key ? (sort.ascending ? " ↑" : " ↓") : " ↕";

  const sortableHeader = (label, key, align = "left") => (
    <th aria-sort={sort.key === key ? (sort.ascending ? "ascending" : "descending") : "none"} style={{ border: "1px solid #ddd", padding: "6px", textAlign: align }}>
      <button type="button" onClick={() => handleSort(key)} style={{ border: 0, background: "transparent", cursor: "pointer", fontWeight: "bold", padding: 0, width: "100%", textAlign: align }}>
        {label}{sortIndicator(key)}
      </button>
    </th>
  );

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handlePageSizeChange = (event) => {
    const value = event.target.value === "all" ? "all" : Number(event.target.value);
    if (value === "all" || (Number.isFinite(value) && value > 0)) {
      setPage(1);
      setPageSize(value);
    }
  };

  const effectivePageSize = pageSize === "all" ? totalCount : pageSize;
  const startItem = totalCount === 0 ? 0 : (page - 1) * effectivePageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(totalCount, page * effectivePageSize);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>배당 데이터</h2>
        <div role="group" aria-label="월 이동" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" aria-label="지난달" onClick={() => handleMonthChange(-1)} disabled={loading}>‹ 지난달</button>
          <strong aria-live="polite">{formatMonthLabel(selectedMonth)}</strong>
          <button type="button" aria-label="다음달" onClick={() => handleMonthChange(1)} disabled={loading}>다음달 ›</button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label htmlFor="pageSize" style={{ fontSize: "0.9em", color: "#555" }}>
            페이지당 표시
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            style={{ padding: "4px 8px" }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option === "all" ? "전체" : `${option}건`}</option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label htmlFor="dividendSearch" style={{ fontSize: "0.9em" }}>검색어</label>
        <input id="dividendSearch" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="종목명 또는 계좌명" style={{ minWidth: 190, padding: "6px 8px" }} />
        <label htmlFor="etfBrand" style={{ fontSize: "0.9em" }}>브랜드</label>
        <select id="etfBrand" value={brandInput} onChange={(event) => setBrandInput(event.target.value)} style={{ padding: "6px 8px" }}>
          {ETF_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
        </select>
        <button type="submit">검색</button>
        <button type="button" onClick={clearFilters}>초기화</button>
      </form>

      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.95em" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {sortableHeader("계좌명", "account_name")}
            {sortableHeader("종목명", "company_name")}
            {sortableHeader("금액", "dividend_amount", "right")}
            {sortableHeader("통화", "currency")}
            {sortableHeader("날짜", "payment_date")}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} style={{ padding: "12px", textAlign: "center" }}>불러오는 중...</td>
            </tr>
          )}
          {!loading && rows.map((item) => (
            <tr key={item.id}>
              <td style={{ border: "1px solid #ddd", padding: "6px" }}>{item.account_name || "-"}</td>
              <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                {(() => {
                  const name = item.company_name || item.stock || "-";
                  const url = sourceLinks[String(item.ticker || name).trim().toUpperCase()] || sourceLinks[String(name).trim().toUpperCase()];
                  return url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : name;
                })()}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "right" }}>{formatAmount(item.dividend_amount, item.currency)}</td>
              <td style={{ border: "1px solid #ddd", padding: "6px" }}>{item.currency || "-"}</td>
              <td style={{ border: "1px solid #ddd", padding: "6px" }}>{item.payment_date || "-"}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "12px", textAlign: "center" }}>등록된 배당 데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: "0.9em", color: "#555" }}>
          총 {totalCount.toLocaleString()}건 중 {startItem.toLocaleString()}-{endItem.toLocaleString()} 표시
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={handlePrev} disabled={page === 1 || loading}>
            이전
          </button>
          <span>페이지 {page} / {totalPages}</span>
          <button type="button" onClick={handleNext} disabled={page === totalPages || loading}>
            다음
          </button>
        </div>
      </div>
    </div>
  );
}

export default DividendData;
