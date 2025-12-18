import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const apiBase = import.meta.env.VITE_API_STRING;

const styles = {
  card: {
    border: "1px solid #d0d7e2",
    borderRadius: 6,
    padding: 10,
    background: "#ffffff",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
  },
  subSectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 11,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    marginBottom: 2,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    alignItems: "center",
  },
  grid1: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  disabledInput: {
    background: "#f3f4f6",
    color: "#9ca3af",
  },
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    minHeight: 40,
    background: "#f7fafc",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  acWrap: {
    position: "relative",
    width: "100%",
  },
  acMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    zIndex: 20,
    maxHeight: 150,
    overflow: "auto",
    fontSize: 11,
  },
  acItem: (active) => ({
    padding: "4px 6px",
    cursor: "pointer",
    background: active ? "#e5edff" : "#fff",
    fontWeight: active ? 700 : 500,
  }),
  inlineHint: { fontSize: 10, color: "#6b7280", marginLeft: 4 },
};

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}
function toUpperVal(e) {
  return e?.target?.value ? e.target.value.toUpperCase() : "";
}

const InvoiceBuyerThirdPartyTab = ({ formik }) => {
  // read nested safely
  const tp = formik.values.buyerThirdPartyInfo?.thirdParty || {};
  const by = formik.values.buyerThirdPartyInfo?.buyer || {};

  const isBuyer = !!formik.values.isBuyer;
  const buyerDisabled = !isBuyer;

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState(tp.name || "");
  const [buyerQuery, setBuyerQuery] = useState(by.name || "");

  const [open, setOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);

  const [active, setActive] = useState(-1);
  const [buyerActive, setBuyerActive] = useState(-1);

  const wrapRef = useRef(null);
  const buyerWrapRef = useRef(null);

  // --------- fetch directory once ----------
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${apiBase}/dsr/consignees`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setOrgs(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching consignees", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (buyerWrapRef.current && !buyerWrapRef.current.contains(e.target)) {
        setBuyerOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // write full thirdParty object
  const setThirdParty = (patch) => {
    const current = formik.values.buyerThirdPartyInfo?.thirdParty || {};
    formik.setFieldValue("buyerThirdPartyInfo.thirdParty", {
      ...current,
      ...patch,
    });
  };

  const setBuyer = (patch) => {
    const current = formik.values.buyerThirdPartyInfo?.buyer || {};
    formik.setFieldValue("buyerThirdPartyInfo.buyer", {
      ...current,
      ...patch,
    });
  };

  const filtered = orgs.filter((o) =>
    toUpper(o.consignee_name || "").includes(toUpper(query))
  );

  const buyerFiltered = orgs.filter((o) =>
    toUpper(o.consignee_name || "").includes(toUpper(buyerQuery))
  );

  // --------- Third Party auto-populate ----------
  useEffect(() => {
    const nameInForm = toUpper(
      formik.values.buyerThirdPartyInfo?.thirdParty?.name || ""
    );
    if (!nameInForm) return;

    const org = orgs.find(
      (o) => toUpper(o.consignee_name || "") === nameInForm
    );
    if (!org) return;

    const address = org.consignee_address || "";
    const country = org.consignee_country || "";

    const current = formik.values.buyerThirdPartyInfo?.thirdParty || {};

    const shouldUpdate =
      toUpper(current.address || "") !== toUpper(address) ||
      toUpper(current.country || "") !== toUpper(country);

    if (!shouldUpdate) return;

    setThirdParty({
      name: toUpper(org.consignee_name || ""),
      address: toUpper(address),
      country: toUpper(country),
      // city, pin, state not available in consignee API
    });

    setQuery(toUpper(org.consignee_name || ""));
  }, [orgs, formik.values.buyerThirdPartyInfo?.thirdParty?.name]);

  // --------- Buyer auto-populate (only when isBuyer) ----------
  useEffect(() => {
    if (!isBuyer) return;

    const nameInForm = toUpper(
      formik.values.buyerThirdPartyInfo?.buyer?.name || ""
    );
    if (!nameInForm) return;

    const org = orgs.find(
      (o) => toUpper(o.consignee_name || "") === nameInForm
    );
    if (!org) return;

    const address = org.consignee_address || "";
    const country = org.consignee_country || "";

    const current = formik.values.buyerThirdPartyInfo?.buyer || {};

    const shouldUpdate =
      toUpper(current.addressLine1 || "") !== toUpper(address) ||
      toUpper(current.country || "") !== toUpper(country);

    if (!shouldUpdate) return;

    setBuyer({
      name: toUpper(org.consignee_name || ""),
      addressLine1: toUpper(address),
      country: toUpper(country),
      // city, pin, state not available in consignee API
    });

    setBuyerQuery(toUpper(org.consignee_name || ""));
  }, [isBuyer, orgs, formik.values.buyerThirdPartyInfo?.buyer?.name]);

  // --------- handlers ----------

  const handleNameInput = (e) => {
    const val = toUpperVal(e);
    setQuery(val);
    setThirdParty({ name: val }); // triggers useEffect when it equals an org
    setOpen(true);
    setActive(-1);
  };

  const handleSelectOrg = (idx) => {
    const org = filtered[idx];
    if (!org) return;
    const val = toUpper(org.consignee_name || "");
    setThirdParty({ name: val }); // rest populated in useEffect
    setQuery(val);
    setOpen(false);
    setActive(-1);
  };

  const handleBuyerNameInput = (e) => {
    const val = toUpperVal(e);
    setBuyerQuery(val);
    setBuyer({ name: val }); // triggers Buyer useEffect
    setBuyerOpen(true);
    setBuyerActive(-1);
  };

  const handleSelectBuyerOrg = (idx) => {
    const org = buyerFiltered[idx];
    if (!org) return;
    const val = toUpper(org.consignee_name || "");
    setBuyer({ name: val }); // rest populated in Buyer useEffect
    setBuyerQuery(val);
    setBuyerOpen(false);
    setBuyerActive(-1);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardRow}>
        {/* LEFT: Third Party Info */}
        <div>
          <div style={styles.subSectionTitle}>Third Party Info</div>
          <div style={styles.grid1}>
            {/* Name with autocomplete */}
            <div>
              <div style={styles.label}>
                Name
                {loading && <span style={styles.inlineHint}> Loading...</span>}
              </div>
              <div style={styles.acWrap} ref={wrapRef}>
                <input
                  style={styles.input}
                  value={query}
                  onChange={handleNameInput}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (!open) return;
                    if (e.key === "ArrowDown") {
                      setActive((a) =>
                        Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
                      );
                    } else if (e.key === "ArrowUp") {
                      setActive((a) => Math.max(0, a - 1));
                    } else if (e.key === "Enter" && active >= 0) {
                      e.preventDefault();
                      handleSelectOrg(active);
                    } else if (e.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                />
                {open && filtered.length > 0 && (
                  <div style={styles.acMenu}>
                    {filtered.map((o, i) => (
                      <div
                        key={o._id || i}
                        style={styles.acItem(active === i)}
                        onMouseDown={() => handleSelectOrg(i)}
                        onMouseEnter={() => setActive(i)}
                      >
                        {toUpper(o.consignee_name || "")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <div style={styles.label}>Address</div>
              <textarea
                style={styles.textarea}
                rows={2}
                value={tp.address || ""}
                onChange={(e) => setThirdParty({ address: e.target.value })}
              />
            </div>

            {/* Country / State */}
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>Country</div>
                <input
                  style={styles.input}
                  value={tp.country || ""}
                  onChange={(e) => setThirdParty({ country: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Buyer Info */}
        <div>
          <div style={styles.subSectionTitle}>Buyer Info</div>
          <div style={styles.grid1}>
            {/* Buyer Name with autocomplete (enabled only when isBuyer) */}
            <div>
              <div style={styles.label}>
                Name
                {loading && isBuyer && (
                  <span style={styles.inlineHint}> Loading...</span>
                )}
              </div>
              <div style={styles.acWrap} ref={buyerWrapRef}>
                <input
                  style={{
                    ...styles.input,
                    ...(buyerDisabled ? styles.disabledInput : {}),
                  }}
                  value={buyerQuery}
                  disabled={buyerDisabled}
                  onChange={handleBuyerNameInput}
                  onFocus={() => !buyerDisabled && setBuyerOpen(true)}
                  onKeyDown={(e) => {
                    if (!buyerOpen || buyerDisabled) return;
                    if (e.key === "ArrowDown") {
                      setBuyerActive((a) =>
                        Math.min(buyerFiltered.length - 1, a < 0 ? 0 : a + 1)
                      );
                    } else if (e.key === "ArrowUp") {
                      setBuyerActive((a) => Math.max(0, a - 1));
                    } else if (e.key === "Enter" && buyerActive >= 0) {
                      e.preventDefault();
                      handleSelectBuyerOrg(buyerActive);
                    } else if (e.key === "Escape") {
                      setBuyerOpen(false);
                    }
                  }}
                />
                {buyerOpen && !buyerDisabled && buyerFiltered.length > 0 && (
                  <div style={styles.acMenu}>
                    {buyerFiltered.map((o, i) => (
                      <div
                        key={o._id || i}
                        style={styles.acItem(buyerActive === i)}
                        onMouseDown={() => handleSelectBuyerOrg(i)}
                        onMouseEnter={() => setBuyerActive(i)}
                      >
                        {toUpper(o.consignee_name || "")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={styles.label}>Address</div>
              <textarea
                style={{
                  ...styles.textarea,
                  ...(buyerDisabled ? styles.disabledInput : {}),
                }}
                rows={2}
                value={by.addressLine1 || ""}
                disabled={buyerDisabled}
                onChange={(e) => setBuyer({ addressLine1: e.target.value })}
              />
            </div>



            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>Country</div>
                <input
                  style={{
                    ...styles.input,
                    ...(buyerDisabled ? styles.disabledInput : {}),
                  }}
                  value={by.country || ""}
                  disabled={buyerDisabled}
                  onChange={(e) => setBuyer({ country: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBuyerThirdPartyTab;
