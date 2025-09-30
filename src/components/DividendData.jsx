import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../api/supabaseClient";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
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

      const { data, count, error: queryError } = await supabase
        .from("dividend_entries")
        .select("*", { count: "exact" })
        .order("payment_date", { ascending: false })
        .range(from, to);

      if (queryError) {
        console.error("배당 데이터 조회 오류:", queryError);
        setError(queryError.message || "데이터를 불러오지 못했습니다.");
        setRows([]);
      } else {
        setRows(data || []);
        setTotalCount(typeof count === "number" ? count : 0);
      }

      setLoading(false);
    };

    fetchPage();
  }, [page, pageSize]);

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

      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.95em" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ border: "1px solid #ddd", padding: "6px" }}>계좌명</th>
            <th style={{ border: "1px solid #ddd", padding: "6px" }}>종목명</th>
            <th style={{ border: "1px solid #ddd", padding: "6px", textAlign: "right" }}>금액</th>
            <th style={{ border: "1px solid #ddd", padding: "6px" }}>통화</th>
            <th style={{ border: "1px solid #ddd", padding: "6px" }}>날짜</th>
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
              <td style={{ border: "1px solid #ddd", padding: "6px" }}>{item.company_name || item.stock || "-"}</td>
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
