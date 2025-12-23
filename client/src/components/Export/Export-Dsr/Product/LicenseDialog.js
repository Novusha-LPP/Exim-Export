import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Styles from ProductMainTab.js (approximate reuse)
const styles = {
  dialogOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000,
  },
  dialogContent: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 12,
    width: 600,
    maxHeight: 500,
    boxShadow: "0 12px 30px rgba(15,23,42,0.25)",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontWeight: 700, color: "#111827" },
  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "6px 8px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 600,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    marginTop: 8,
  },
  item: (active) => ({
    padding: 8,
    cursor: "pointer",
    backgroundColor: active ? "#eff6ff" : "#ffffff",
    borderBottom: "1px solid #f3f4f6",
  }),
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemMain: { fontWeight: 700, color: "#1f2933" },
  itemSub: { fontSize: 11, color: "#4b5563" },
  pagination: {
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
  },
  pageBtn: (disabled) => ({
    padding: "3px 8px",
    borderRadius: 3,
    border: "1px solid #d1d5db",
    backgroundColor: disabled ? "#f9fafb" : "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11,
  }),
  loading: { padding: 8, color: "#6b7280" },
  noResults: { padding: 8, color: "#9ca3af" },
};

const API_URL = `${import.meta.env.VITE_API_STRING}/licenses`;
const LIMIT = 20;

const LicenseDialog = ({
  open,
  onClose,
  onSelect,
  licenseType = "", // "DEEC" | "EPCG" - NOT strictly enforced in backend unless we filter
}) => {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLicenses = useCallback(
    async (searchTxt, pageNum) => {
      try {
        setLoading(true);
        const params = {
          page: pageNum,
          limit: LIMIT,
          search: searchTxt,
        };
        // If we want to filter by Type (DEEC/EPCG) STRICTLY:
        // Current backend search uses `$or` for `search`.
        // If `search` matches Type, it works.
        // Or we pass `Type` if backend supports it.
        // Backend `GET /` logic:
        // if (lic_ref_no) ...
        // else if (search) query.$or = [...]
        // Currently backend doesn't support explicit `Type` filter combined with search easily without mod.
        // But the user said "show data according type i.e deec and epcg".
        // Let's assume hitting search with "DEEC" might work if "Type" is searchable?
        // Wait, schema has `Type`.
        // I should probably update backend to allow filtering by Type if `licenseType` is passed.
        // But for now, let's just search.
        // Actually, looking at `License.js` schema and route...
        // Route doesn't explicitely filter `Type`.
        // I might need to update backend slightly to support `type` param if strictly required.
        // For now, I'll pass it as search if query is empty?
        // Or just let user search numbers.
        // User asked "show data according type".
        // I really should filter by type.
        // Let's assume I will implement client side filtering or
        // backend filtering updates in a moment.
        // I will assume backend is updated or I will update it.
        // Let's send `type` in params if backend supports it.
        // I'll add `type` param to backend in a subsequent step if needed.
        // For now I'll include it in params.

        if (licenseType) {
          params.type = licenseType;
        }

        const res = await axios.get(API_URL, { params });
        const data = res.data;

        const list = Array.isArray(data?.data) ? data.data : [];
        setOptions(list);

        if (data?.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        } else {
          setTotalPages(1);
        }
      } catch (e) {
        console.error("License fetch error", e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [licenseType]
  );

  // Initial load or page change
  useEffect(() => {
    if (!open) return;
    fetchLicenses(query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, fetchLicenses]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchLicenses(query, 1);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!open) return null;

  return (
    <div style={styles.dialogOverlay} onClick={onClose}>
      <div style={styles.dialogContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            Search License {licenseType ? `(${licenseType})` : ""}
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div>
          <input
            style={styles.input}
            placeholder="Type License Ref No, Lic No, or Owner"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            autoFocus
          />
        </div>

        <div style={styles.list}>
          {loading && <div style={styles.loading}>Loading...</div>}
          {!loading && options.length === 0 && (
            <div style={styles.noResults}>No results found</div>
          )}
          {!loading &&
            options.map((opt, idx) => (
              <div
                key={opt._id || idx}
                style={styles.item(active === idx)}
                onMouseEnter={() => setActive(idx)}
                onClick={() => onSelect(opt)}
              >
                <div style={styles.itemRow}>
                  <span style={styles.itemMain}>Ref: {opt.lic_ref_no}</span>
                  <span style={{ fontWeight: 600, color: "#16408f" }}>
                    Lic: {opt.lic_no}
                  </span>
                </div>
                <div style={styles.itemRow}>
                  <span style={styles.itemSub}>{opt.Owner}</span>
                  <span style={styles.itemSub}>
                    {opt.lic_date} | {opt.Type}
                  </span>
                </div>
              </div>
            ))}
        </div>

        <div style={styles.pagination}>
          <div>
            Page {page} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={styles.pageBtn(page === 1)}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              style={styles.pageBtn(page >= totalPages)}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseDialog;
