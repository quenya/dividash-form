import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../api/supabaseClient";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ETF_BRANDS = ["전체", "KODEX", "RISE", "SOL", "TIGER", "ACE", "HANARO", "KOSEF", "PLUS", "TIMEFOLIO"];
const WON_SYMBOL = String.fromCharCode(0x20A9);

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
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceLinks, setSourceLinks] = useState({});
  const [sort, setSort] = useState({ key: "payment_date", ascending: false });
  const [searchInput, setSearchInput] = useState("");
  const [brandInput, setBrandInput] = useState("전체");
  const [filters, setFilters] = useState({ search: "", brand: "전체" });

  const totalPages = useMemo(() => {
    if (!totalCount) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let dividendQuery = supabase.from("dividend_entries").select("*", { count: "exact" });
      if (filters.search.trim()) {
        const term = filters.search.trim().replace(/[%(),]/g, " ");
        dividendQuery = dividendQuery.or(`company_name.ilike.%${term}%,account_name.ilike.%${term}%`);
      }
      if (filters.brand !== "전체") dividendQuery = dividendQuery.ilike("company_name", `${filters.brand}%`);
      const [{ data, count, error: queryError }, { data: cache }, { data: matches }] = await Promise.all([
        dividendQuery.order(sort.key, { ascending: sort.ascending, nullsFirst: false }).range(from, to),
        supabase.from("etf_product_cache").select("ticker,official_url"),
        supabase.from("ticker_matches").select("source_input,matched_company_name,matched_ticker,status,confidence"),
      ]);

      if (queryError) {
        console.error("배당 데이터 조회 오류:", queryError);
        setError(queryError.message || "데이터를 불러오지 못했습니다.");
        setRows([]);
      } else {
        setRows(data || []);
        setTotalCount(typeof count === "number" ? count : 0);
        const links = {};
        (cache || []).forEach((item) => { if (item.official_url) links[String(item.ticker).trim().toUpperCase()] = item.official_url; });
        (matches || []).forEach((match) => {
          if (match.status !== "confirmed" || match.confidence !== "high") return;
          const url = links[String(match.matched_ticker || "").trim().toUpperCase()];
          if (url) {
            links[String(match.source_input || "").trim().toUpperCase()] = url;
            links[String(match.matched_company_name || "").trim().toUpperCase()] = url;
          }
        });
        setSourceLinks(links);
      }

      setLoading(false);
    };

    fetchPage();
  }, [page, pageSize, sort, filters]);

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
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setPage(1);
      setPageSize(value);
    }
  };

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>배당 데이터</h2>
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
              <option key={option} value={option}>{option}건</option>
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
