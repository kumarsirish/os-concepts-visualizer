import { useState } from "react";

const t = {
  bg: "#f6f8fb", panel: "#ffffff", panelAlt: "#f3f6fa",
  border: "#d0d7de", borderSoft: "#e5eaf0",
  text: "#1a1a1a", muted: "#555",
  blue: "#0969da", blueSoft: "#dbeafe",
  green: "#1a7f37", greenSoft: "#e7f6ec",
  red: "#cf222e", redSoft: "#fdebec",
  amber: "#9a6700", amberSoft: "#fff8e1",
  purple: "#6e40c9", purpleSoft: "#f0ebff",
  shadow: "0 2px 12px rgba(31,35,40,0.08)",
};
const mono = "'Courier New', monospace";
function toBin(val, bits) { return val.toString(2).padStart(bits, "0"); }

function HomeButton() {
  return (
    <a href="./" title="Back to Home" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 34, height: 34, borderRadius: 8, border: `1px solid ${t.border}`,
      background: t.panel, color: t.text, textDecoration: "none", flexShrink: 0,
    }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h2.5a.5.5 0 0 0 .5-.5V11h2v2.5a.5.5 0 0 0 .5.5H11a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6z"/>
      </svg>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGING TAB
// ═══════════════════════════════════════════════════════════════════════════════
const NUM_PAGES   = 16;
const PAGE_SIZE   = 16;
const OFFSET_BITS = 4;
const PAGE_BITS   = 4;
const DEFAULT_PAGE_TABLE = [3, 7, 1, 5, 2, 6, 0, 4, 9, null, 11, 8, 13, 10, 15, 12];

function PageTableColumn({ table, activePage, onTableChange }) {
  function handleEdit(pg, raw) {
    const updated = [...table];
    updated[pg] = (raw === "" || raw === "X" || raw === "x" || raw === "-") ? null : (parseInt(raw) || null);
    onTableChange(updated);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: t.shadow }}>
      <div style={{ background: t.panelAlt, borderBottom: `1px solid ${t.border}`, padding: "8px 14px", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Page Table</div>
        <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>Click a frame to edit · X = page fault</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}`, background: t.panelAlt, flexShrink: 0 }}>
        <div style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1 }}>PAGE #</div>
        <div style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, borderLeft: `1px solid ${t.border}` }}>FRAME #</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {table.map((frame, pg) => {
          const isActive = pg === activePage;
          const isFault  = frame === null;
          return (
            <div key={pg} style={{
              flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0,
              borderBottom: pg < NUM_PAGES - 1 ? `1px solid ${t.borderSoft}` : "none",
              background: isActive ? (isFault ? t.redSoft : t.blueSoft) : "transparent",
              transition: "background 0.2s",
            }}>
              <div style={{ padding: "0 14px", fontSize: 15, fontWeight: isActive ? 700 : 400, color: isActive ? (isFault ? t.red : t.blue) : t.text, display: "flex", alignItems: "center", gap: 6 }}>
                {isActive && <span style={{ fontSize: 11 }}>▶</span>}
                {pg}
                {isActive && <span style={{ fontSize: 11, color: t.muted }}>({toBin(pg, PAGE_BITS)})</span>}
              </div>
              <div style={{ borderLeft: `1px solid ${t.borderSoft}`, padding: "0 8px", display: "flex", alignItems: "center" }}>
                <input
                  defaultValue={isFault ? "X" : String(frame)}
                  key={`${pg}-${frame}`}
                  onBlur={e => handleEdit(pg, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${isActive ? (isFault ? t.red : t.blue) : "transparent"}`, borderRadius: 4, padding: "2px 6px", fontFamily: mono, fontSize: 15, fontWeight: isActive ? 700 : 400, color: isFault ? t.red : (isActive ? t.blue : t.text), outline: "none" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PagingTab() {
  const [address, setAddress] = useState("37");
  const [table,   setTable]   = useState([...DEFAULT_PAGE_TABLE]);

  const logical    = parseInt(address);
  const valid      = !isNaN(logical) && logical >= 0 && logical <= 255;
  const bin        = valid ? toBin(logical, 8) : "????????";
  const activePage = valid ? (logical >> OFFSET_BITS) : null;
  const offset     = valid ? (logical & (PAGE_SIZE - 1)) : null;
  const frame      = valid ? table[activePage] : null;
  const pageFault  = valid && frame === null;
  const physical   = (!pageFault && valid) ? (frame * PAGE_SIZE + offset) : null;

  const stepTitle = { fontSize: 15, fontWeight: 700, color: t.muted, marginBottom: 12, letterSpacing: 0.4 };
  const card = { background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: t.shadow, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" };

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 20, padding: "14px 24px", boxSizing: "border-box" }}>
      {/* Address input strip */}
      <div style={{ flex: "0 0 200px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: t.shadow, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.muted, marginBottom: 8 }}>LOGICAL ADDRESS (0–255)</div>
          <input type="number" min={0} max={255} value={address} onChange={e => setAddress(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `2px solid ${valid ? t.blue : t.red}`, background: t.panel, fontFamily: mono, fontSize: 26, fontWeight: 700, color: t.blue, outline: "none", textAlign: "center", boxSizing: "border-box" }} />
          <input type="range" min={0} max={255} value={valid ? logical : 0} onChange={e => setAddress(e.target.value)}
            style={{ width: "100%", accentColor: t.blue, marginTop: 8 }} />
          <div style={{ fontSize: 12, color: t.muted, marginTop: 6, textAlign: "center" }}>
            Binary: <strong style={{ color: t.text, fontFamily: mono }}>{bin}</strong>
          </div>
        </div>
        <PageTableColumn table={table} activePage={activePage} onTableChange={setTable} />
      </div>

      {/* 2×2 step grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, minWidth: 0, overflow: "hidden" }}>
        {valid ? (<>
          {/* Step 1 */}
          <div style={card}>
            <div style={stepTitle}>STEP 1 — Binary Representation</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 3 }}>Decimal</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: t.blue, fontFamily: mono, lineHeight: 1 }}>{logical}</div>
              </div>
              <div style={{ fontSize: 22, color: t.muted }}>=</div>
              <div>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 6 }}>Binary (8 bits)</div>
                <div style={{ display: "flex", fontFamily: mono, fontSize: 26, fontWeight: 700, letterSpacing: 5 }}>
                  {bin.slice(0, 4).split("").map((b, i) => <span key={i} style={{ color: t.amber }}>{b}</span>)}
                  {bin.slice(4).split("").map((b, i) => <span key={i+4} style={{ color: t.blue }}>{b}</span>)}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: t.amber, fontWeight: 700 }}>▲ page number (4 bits)</div>
                  <div style={{ fontSize: 12, color: t.blue, fontWeight: 700 }}>▲ offset (4 bits)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={card}>
            <div style={stepTitle}>STEP 2 — Split Address</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ background: t.amberSoft, border: `2px solid ${t.amber}`, borderRadius: 8, padding: "10px 16px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: t.amber, fontWeight: 700, marginBottom: 4 }}>PAGE NUMBER</div>
                <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: t.amber, letterSpacing: 4 }}>{toBin(activePage, PAGE_BITS)}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginTop: 3 }}>= {activePage}</div>
                <div style={{ fontSize: 13, color: t.amber, marginTop: 8, lineHeight: 1.7 }}>
                  {logical} ÷ {PAGE_SIZE} = <strong>{activePage}</strong> rem {offset}
                </div>
              </div>
              <div style={{ background: t.blueSoft, border: `2px solid ${t.blue}`, borderRadius: 8, padding: "10px 16px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: t.blue, fontWeight: 700, marginBottom: 4 }}>OFFSET</div>
                <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: t.blue, letterSpacing: 4 }}>{toBin(offset, OFFSET_BITS)}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginTop: 3 }}>= {offset}</div>
                <div style={{ fontSize: 13, color: t.blue, marginTop: 8, lineHeight: 1.7 }}>
                  {logical} mod {PAGE_SIZE} = <strong>{offset}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ ...card, border: `1px solid ${pageFault ? t.red : t.border}` }}>
            <div style={stepTitle}>STEP 3 — Page Table Lookup</div>
            <div style={{ fontSize: 15, color: t.text, marginBottom: 10 }}>Look up <strong style={{ color: t.amber }}>Page {activePage}</strong>:</div>
            {pageFault ? (
              <div style={{ background: t.redSoft, border: `2px solid ${t.red}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.red, marginBottom: 4 }}>⚠ PAGE FAULT</div>
                <div style={{ fontSize: 14, color: t.red }}>Page {activePage} is <strong>not in physical memory</strong>. The OS must load it from disk.</div>
              </div>
            ) : (
              <div style={{ background: t.greenSoft, border: `2px solid ${t.green}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.green, marginBottom: 4 }}>Page {activePage} → Frame {frame}</div>
                <div style={{ fontSize: 14, color: t.text }}>Page {activePage} is stored in physical <strong>frame {frame}</strong>.</div>
              </div>
            )}
          </div>

          {/* Step 4 */}
          <div style={{ ...card, border: pageFault ? `1px solid ${t.border}` : `2px solid ${t.purple}` }}>
            <div style={stepTitle}>STEP 4 — Physical Address</div>
            {pageFault ? (
              <div style={{ fontSize: 15, color: t.muted }}>Cannot compute — page not in memory.</div>
            ) : (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ background: t.purpleSoft, border: `2px solid ${t.purple}`, borderRadius: 10, padding: "12px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Physical Address</div>
                  <div style={{ fontSize: 46, fontWeight: 700, color: t.purple, fontFamily: mono, lineHeight: 1 }}>{physical}</div>
                </div>
                <div style={{ fontSize: 15, color: t.muted, lineHeight: 2.2, fontFamily: mono }}>
                  <div>Frame {frame} × {PAGE_SIZE} = <strong style={{ color: t.text }}>{frame * PAGE_SIZE}</strong></div>
                  <div>+ Offset <strong style={{ color: t.blue }}>{offset}</strong></div>
                  <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>= <strong style={{ color: t.purple, fontSize: 20 }}>{physical}</strong></div>
                </div>
              </div>
            )}
          </div>
        </>) : (
          <div style={{ gridColumn: "1/-1", gridRow: "1/-1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}`, borderRadius: 8, padding: "16px 24px", color: t.red, fontWeight: 700, fontSize: 16 }}>Address must be between 0 and 255.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENTATION TAB
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_SEGMENTS = [
  { name: "Code",  base: 0,   limit: 64 },
  { name: "Data",  base: 64,  limit: 48 },
  { name: "Stack", base: 128, limit: 64 },
  { name: "Heap",  base: 192, limit: 48 },
];
const SEG_COLORS = [t.blue, t.green, t.amber, t.purple];

function SegTable({ segments, activeSeg, onSegChange }) {
  function handleEdit(i, field, val) {
    const updated = segments.map((s, j) => j === i ? { ...s, [field]: field === "name" ? val : (parseInt(val) || 0) } : s);
    onSegChange(updated);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: t.shadow }}>
      <div style={{ background: t.panelAlt, borderBottom: `1px solid ${t.border}`, padding: "8px 14px", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Segment Table</div>
        <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>Click values to edit</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 50px 50px", borderBottom: `1px solid ${t.border}`, background: t.panelAlt, flexShrink: 0 }}>
        <div style={{ padding: "5px 6px", fontSize: 11, fontWeight: 700, color: t.muted }}>#</div>
        <div style={{ padding: "5px 6px", fontSize: 11, fontWeight: 700, color: t.muted }}>NAME</div>
        <div style={{ padding: "5px 6px", fontSize: 11, fontWeight: 700, color: t.muted }}>BASE</div>
        <div style={{ padding: "5px 6px", fontSize: 11, fontWeight: 700, color: t.muted, borderLeft: `1px solid ${t.border}` }}>LIMIT</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {segments.map((seg, i) => {
          const isActive = i === activeSeg;
          return (
            <div key={i} style={{ flex: 1, display: "grid", gridTemplateColumns: "28px 1fr 50px 50px", minHeight: 0, borderBottom: i < segments.length - 1 ? `1px solid ${t.borderSoft}` : "none", background: isActive ? `${SEG_COLORS[i]}18` : "transparent", transition: "background 0.2s" }}>
              <div style={{ padding: "0 6px", fontSize: 15, fontWeight: 700, color: SEG_COLORS[i], display: "flex", alignItems: "center" }}>
                {isActive && "▶"}{!isActive && i}
              </div>
              <div style={{ padding: "0 4px", display: "flex", alignItems: "center" }}>
                <input value={seg.name} onChange={e => handleEdit(i, "name", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", fontFamily: mono, fontSize: 14, fontWeight: isActive ? 700 : 400, color: SEG_COLORS[i], outline: "none" }} />
              </div>
              <div style={{ padding: "0 4px", display: "flex", alignItems: "center" }}>
                <input type="number" value={seg.base} onChange={e => handleEdit(i, "base", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", fontFamily: mono, fontSize: 13, color: t.text, outline: "none" }} />
              </div>
              <div style={{ borderLeft: `1px solid ${t.borderSoft}`, padding: "0 4px", display: "flex", alignItems: "center" }}>
                <input type="number" value={seg.limit} onChange={e => handleEdit(i, "limit", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", fontFamily: mono, fontSize: 13, color: t.text, outline: "none" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentationTab() {
  const [segments,  setSegments]  = useState(DEFAULT_SEGMENTS.map(s => ({ ...s })));
  const [segNum,    setSegNum]    = useState(0);
  const [offsetVal, setOffsetVal] = useState("20");

  const seg        = segments[segNum];
  const offset     = parseInt(offsetVal);
  const validOff   = !isNaN(offset) && offset >= 0;
  const segFault   = validOff && offset >= seg.limit;
  const physical   = (validOff && !segFault) ? seg.base + offset : null;

  const stepTitle = { fontSize: 15, fontWeight: 700, color: t.muted, marginBottom: 12, letterSpacing: 0.4 };
  const card = { background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: t.shadow, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" };

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 20, padding: "14px 24px", boxSizing: "border-box" }}>
      {/* Left: input + segment table */}
      <div style={{ flex: "0 0 200px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Inputs */}
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: t.shadow, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.muted, marginBottom: 8 }}>LOGICAL ADDRESS</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Segment #</div>
            <div style={{ display: "flex", gap: 6 }}>
              {segments.map((s, i) => (
                <button key={i} onClick={() => setSegNum(i)} style={{
                  flex: 1, padding: "6px 4px", borderRadius: 6, fontFamily: mono, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `2px solid ${SEG_COLORS[i]}`,
                  background: segNum === i ? SEG_COLORS[i] : "transparent",
                  color: segNum === i ? "#fff" : SEG_COLORS[i],
                }}>{i}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: SEG_COLORS[segNum], marginTop: 4, fontWeight: 700 }}>{seg.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Offset (0 – {seg.limit - 1})</div>
            <input type="number" min={0} value={offsetVal} onChange={e => setOffsetVal(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `2px solid ${validOff ? (segFault ? t.red : t.green) : t.red}`, background: t.panel, fontFamily: mono, fontSize: 26, fontWeight: 700, color: segFault ? t.red : t.green, outline: "none", textAlign: "center", boxSizing: "border-box" }} />
            <input type="range" min={0} max={seg.limit - 1} value={validOff ? Math.min(offset, seg.limit - 1) : 0} onChange={e => setOffsetVal(e.target.value)}
              style={{ width: "100%", accentColor: SEG_COLORS[segNum], marginTop: 8 }} />
          </div>
        </div>
        <SegTable segments={segments} activeSeg={segNum} onSegChange={setSegments} />
      </div>

      {/* 2×2 step grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, minWidth: 0, overflow: "hidden" }}>
        {/* Step 1 */}
        <div style={card}>
          <div style={stepTitle}>STEP 1 — Logical Address</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ background: `${SEG_COLORS[segNum]}18`, border: `2px solid ${SEG_COLORS[segNum]}`, borderRadius: 10, padding: "14px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 6 }}>Logical Address</div>
              <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: SEG_COLORS[segNum] }}>
                ({segNum}, {validOff ? offset : "?"})
              </div>
              <div style={{ fontSize: 13, color: t.muted, marginTop: 6 }}>segment {segNum} · offset {validOff ? offset : "?"}</div>
            </div>
            <div style={{ fontSize: 14, color: t.muted, lineHeight: 1.9, maxWidth: 200 }}>
              A segmentation address is a <strong>pair</strong>: which segment, and how far into it.
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={card}>
          <div style={stepTitle}>STEP 2 — Segment Table Lookup</div>
          <div style={{ fontSize: 15, color: t.text, marginBottom: 10 }}>
            Look up <strong style={{ color: SEG_COLORS[segNum] }}>Segment {segNum} ({seg.name})</strong>:
          </div>
          <div style={{ background: `${SEG_COLORS[segNum]}18`, border: `2px solid ${SEG_COLORS[segNum]}`, borderRadius: 8, padding: "12px 18px", display: "flex", gap: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Base</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: SEG_COLORS[segNum], fontFamily: mono }}>{seg.base}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Limit (size)</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: t.text, fontFamily: mono }}>{seg.limit}</div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ ...card, border: `1px solid ${!validOff ? t.border : segFault ? t.red : t.green}` }}>
          <div style={stepTitle}>STEP 3 — Bounds Check</div>
          <div style={{ fontSize: 15, color: t.text, marginBottom: 10 }}>
            Is offset <strong style={{ color: t.blue }}>{validOff ? offset : "?"}</strong> &lt; limit <strong style={{ color: t.text }}>{seg.limit}</strong>?
          </div>
          {validOff && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ background: t.blueSoft, border: `2px solid ${t.blue}`, borderRadius: 8, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 2 }}>Offset</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: t.blue, fontFamily: mono }}>{offset}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: segFault ? t.red : t.green }}>{segFault ? "≥" : "<"}</div>
              <div style={{ background: t.panelAlt, border: `2px solid ${t.border}`, borderRadius: 8, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 2 }}>Limit</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: t.text, fontFamily: mono }}>{seg.limit}</div>
              </div>
              <div style={{ background: segFault ? t.redSoft : t.greenSoft, border: `2px solid ${segFault ? t.red : t.green}`, borderRadius: 8, padding: "10px 18px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: segFault ? t.red : t.green }}>{segFault ? "⚠ FAULT" : "✓ OK"}</div>
              </div>
            </div>
          )}
          {validOff && segFault && (
            <div style={{ marginTop: 10, fontSize: 13, color: t.red, fontWeight: 600 }}>
              Offset {offset} ≥ limit {seg.limit} — illegal access outside the segment.
            </div>
          )}
        </div>

        {/* Step 4 */}
        <div style={{ ...card, border: (validOff && !segFault) ? `2px solid ${t.purple}` : `1px solid ${t.border}` }}>
          <div style={stepTitle}>STEP 4 — Physical Address</div>
          {!validOff || segFault ? (
            <div style={{ fontSize: 15, color: t.muted }}>
              {segFault ? "Cannot compute — segmentation fault." : "Enter a valid offset to continue."}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: t.purpleSoft, border: `2px solid ${t.purple}`, borderRadius: 10, padding: "12px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Physical Address</div>
                <div style={{ fontSize: 46, fontWeight: 700, color: t.purple, fontFamily: mono, lineHeight: 1 }}>{physical}</div>
              </div>
              <div style={{ fontSize: 15, color: t.muted, lineHeight: 2.2, fontFamily: mono }}>
                <div>Base <strong style={{ color: SEG_COLORS[segNum] }}>{seg.base}</strong></div>
                <div>+ Offset <strong style={{ color: t.blue }}>{offset}</strong></div>
                <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>= <strong style={{ color: t.purple, fontSize: 20 }}>{physical}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PageTableTranslation() {
  const [tab, setTab] = useState("paging");

  return (
    <div style={{ fontFamily: mono, background: t.bg, height: "100vh", color: t.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: t.panel, borderBottom: `1px solid ${t.border}`, padding: "10px 24px 0", flexShrink: 0 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <HomeButton />
            <div>
              <div style={{ fontWeight: 700, fontSize: 28, color: t.text }}>Address Translation</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>8-bit address space · interactive visualizer</div>
            </div>
          </div>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { key: "paging",       label: "📋  Paging" },
              { key: "segmentation", label: "📐  Segmentation" },
            ].map(tb => (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                background: "none", border: "none",
                borderBottom: `3px solid ${tab === tb.key ? t.blue : "transparent"}`,
                color: tab === tb.key ? t.blue : t.muted,
                fontFamily: mono, fontSize: 14, fontWeight: 700, cursor: "pointer",
                padding: "8px 22px", transition: "all 0.15s",
              }}>{tb.label}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === "paging"       ? <PagingTab /> : <SegmentationTab />}
    </div>
  );
}
