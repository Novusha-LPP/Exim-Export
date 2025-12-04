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

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(tp.name || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);

  const buyerDisabled = true;

  // --------- fetch directory once ----------
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${apiBase}/directory`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setOrgs(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching directory", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
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
    toUpper(o.organization || "").includes(toUpper(query))
  );

  // --------- EXACT analogue of GeneralTab exporter useEffect ----------
  useEffect(() => {
    const nameInForm = toUpper(
      formik.values.buyerThirdPartyInfo?.thirdParty?.name || ""
    );
    if (!nameInForm) return;

    const org = orgs.find(
      (o) => toUpper(o.organization || "") === nameInForm
    );
    if (!org) return;

    const branch = org.branchInfo?.[0] || {};
    const address = `${branch.address || ""}${
      branch.postalCode ? `, ${branch.postalCode}` : ""
    }`;

    const current = formik.values.buyerThirdPartyInfo?.thirdParty || {};

    const shouldUpdate =
      toUpper(current.address || "") !== toUpper(address) ||
      toUpper(current.city || "") !== toUpper(branch.city || "") ||
      (current.pin || "") !== (branch.postalCode || "") ||
      toUpper(current.country || "") !== toUpper(branch.country || "") ||
      toUpper(current.state || "") !== toUpper(branch.state || "");

    if (!shouldUpdate) return;

    setThirdParty({
      name: toUpper(org.organization || ""),
      address: toUpper(address),
      city: toUpper(branch.city || ""),
      pin: branch.postalCode || "",
      country: toUpper(branch.country || ""),
      state: toUpper(branch.state || ""),
    });

    setQuery(toUpper(org.organization || ""));
  }, [orgs, formik.values.buyerThirdPartyInfo?.thirdParty?.name]);

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
    const val = toUpper(org.organization || "");
    setThirdParty({ name: val }); // rest populated in useEffect
    setQuery(val);
    setOpen(false);
    setActive(-1);
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
                        {toUpper(o.organization || "")}
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

            {/* City / PIN */}
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>City</div>
                <input
                  style={styles.input}
                  value={tp.city || ""}
                  onChange={(e) => setThirdParty({ city: e.target.value })}
                />
              </div>
              <div>
                <div style={styles.label}>PIN</div>
                <input
                  style={styles.input}
                  value={tp.pin || ""}
                  onChange={(e) => setThirdParty({ pin: e.target.value })}
                />
              </div>
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
              <div>
                <div style={styles.label}>State</div>
                <input
                  style={styles.input}
                  value={tp.state || ""}
                  onChange={(e) => setThirdParty({ state: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Buyer Info (disabled) */}
        <div>
          <div style={styles.subSectionTitle}>Buyer Info</div>
          <div style={styles.grid1}>
            <div>
              <div style={styles.label}>Name</div>
              <input
                style={{ ...styles.input, ...styles.disabledInput }}
                value={by.name || ""}
                disabled={buyerDisabled}
                onChange={(e) => setBuyer({ name: e.target.value })}
              />
            </div>
            <div>
              <div style={styles.label}>Address</div>
              <textarea
                style={{ ...styles.textarea, ...styles.disabledInput }}
                rows={2}
                value={by.addressLine1 || ""}
                disabled={buyerDisabled}
                onChange={(e) => setBuyer({ addressLine1: e.target.value })}
              />
            </div>
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>City</div>
                <input
                  style={{ ...styles.input, ...styles.disabledInput }}
                  value={by.city || ""}
                  disabled={buyerDisabled}
                  onChange={(e) => setBuyer({ city: e.target.value })}
                />
              </div>
              <div>
                <div style={styles.label}>PIN</div>
                <input
                  style={{ ...styles.input, ...styles.disabledInput }}
                  value={by.pin || ""}
                  disabled={buyerDisabled}
                  onChange={(e) => setBuyer({ pin: e.target.value })}
                />
              </div>
            </div>
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>Country</div>
                <input
                  style={{ ...styles.input, ...styles.disabledInput }}
                  value={by.country || ""}
                  disabled={buyerDisabled}
                  onChange={(e) => setBuyer({ country: e.target.value })}
                />
              </div>
              <div>
                <div style={styles.label}>State</div>
                <input
                  style={{ ...styles.input, ...styles.disabledInput }}
                  value={by.state || ""}
                  disabled={buyerDisabled}
                  onChange={(e) => setBuyer({ state: e.target.value })}
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
