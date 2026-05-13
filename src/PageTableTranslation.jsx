import { useState } from "react";

// ─── Shared theme ─────────────────────────────────────────────────────────────
const t = {
  bg: "#f6f8fb",
  panel: "#ffffff",
  panelAlt: "#f3f6fa",
  border: "#d0d7de",
  borderSoft: "#e5eaf0",
  text: "#1a1a1a",
  muted: "#555",
  blue: "#0969da",
  blueSoft: "#dbeafe",
  green: "#1a7f37",
  greenSoft: "#e7f6ec",
  red: "#cf222e",
  redSoft: "#fdebec",
  amber: "#9a6700",
  amberSoft: "#fff8e1",
  purple: "#6e40c9",
  purpleSoft: "#f0ebff",
  shadow: "0 4px 16px rgba(31,35,40,0.08)",
};

const monoFont = "'Courier New', monospace";

const btnBase = {
  padding: "8px 16px", borderRadius: 6, border: `1px solid ${t.border}`,
  background: t.panelAlt, color: t.text, fontFamily: monoFont,
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};

function HomeButton() {
  return (
    <a href="/" title="Back to Home" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 36, height: 36, borderRadius: 8, border: `1px solid ${t.border}`,
      background: t.panel, color: t.text, textDecoration: "none", flexShrink: 0,
      transition: "background 0.15s",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h2.5a.5.5 0 0 0 .5-.5V11h2v2.5a.5.5 0 0 0 .5.5H11a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6z"/>
      </svg>
    </a>
  );
}

// ─── Top header shared by both tabs ───────────────────────────────────────────
function TopBar({ activeTab, setActiveTab }) {
  return (
    <div style={{ background: t.panel, borderBottom: `1px solid ${t.border}`, padding: "0 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 0" }}>
          <HomeButton />
          <div>
            <div style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 18, color: t.text }}>
              Address Translation
            </div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
              Logical → Physical memory translation
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
          {[
            { key: "paging", label: "📋  Page Table" },
            { key: "segmentation", label: "📐  Segmentation" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: "none", border: "none", borderBottom: `3px solid ${activeTab === tab.key ? t.blue : "transparent"}`,
              color: activeTab === tab.key ? t.blue : t.muted,
              fontFamily: monoFont, fontSize: 13, fontWeight: 700, cursor: "pointer",
              padding: "10px 20px", transition: "all 0.15s", letterSpacing: 0.3,
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — PAGE TABLE TRANSLATION
// ═══════════════════════════════════════════════════════════════════════════════

const PAGE_PRESETS = [
  {
    label: "Basic (4 pages)",
    logicalAddrBits: 4, pageSizeBits: 2,
    pageTable: [2, 5, 1, 7], address: 6,
  },
  {
    label: "8-bit address space",
    logicalAddrBits: 8, pageSizeBits: 4,
    pageTable: [3, 7, 1, 5, 2, 6, 0, 4, 9, 8, 11, 10, 13, 12, 15, 14], address: 37,
  },
  {
    label: "Page fault demo",
    logicalAddrBits: 4, pageSizeBits: 2,
    pageTable: [2, null, 1, 7], address: 5,
  },
];

function toBin(val, bits) {
  return val.toString(2).padStart(bits, "0");
}

function StepCard({ children, highlight }) {
  return (
    <div style={{
      background: t.panel, border: `2px solid ${highlight ? t.blue : t.border}`,
      borderRadius: 10, padding: "18px 20px", boxShadow: highlight ? t.shadow : "none",
      transition: "border-color 0.2s",
    }}>
      {children}
    </div>
  );
}

function StepTitle({ n, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function PageTableTab() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [logicalAddrBits, setLogicalAddrBits] = useState(PAGE_PRESETS[0].logicalAddrBits);
  const [pageSizeBits, setPageSizeBits] = useState(PAGE_PRESETS[0].pageSizeBits);
  const [pageTableInput, setPageTableInput] = useState(PAGE_PRESETS[0].pageTable.map(v => v == null ? "X" : v).join(" "));
  const [addressInput, setAddressInput] = useState(String(PAGE_PRESETS[0].address));
  const [animStep, setAnimStep] = useState(0);

  const pageSize = 1 << pageSizeBits;
  const numPages = 1 << (logicalAddrBits - pageSizeBits);
  const maxAddr = (1 << logicalAddrBits) - 1;

  const pageTable = pageTableInput.trim().split(/\s+/).map(v => {
    if (v === "X" || v === "x" || v === "-") return null;
    const n = parseInt(v); return isNaN(n) ? null : n;
  });

  const logicalAddr = parseInt(addressInput);
  const validAddr = !isNaN(logicalAddr) && logicalAddr >= 0 && logicalAddr <= maxAddr;
  const pnBits = logicalAddrBits - pageSizeBits;
  const offsetBitsCount = pageSizeBits;

  const pageNumber = validAddr ? logicalAddr >> pageSizeBits : 0;
  const offset = validAddr ? logicalAddr & ((1 << pageSizeBits) - 1) : 0;
  const frameNumber = pageTable[pageNumber] ?? null;
  const pageFault = frameNumber === null;
  const physicalAddr = !pageFault && validAddr ? (frameNumber << pageSizeBits) | offset : null;

  const binAddr = validAddr ? toBin(logicalAddr, logicalAddrBits) : "?".repeat(logicalAddrBits);
  const binPN = validAddr ? binAddr.slice(0, pnBits) : "?".repeat(pnBits);
  const binOffset = validAddr ? binAddr.slice(pnBits) : "?".repeat(offsetBitsCount);

  const maxStep = pageFault ? 2 : 3;

  function applyPreset(idx) {
    const p = PAGE_PRESETS[idx];
    setPresetIdx(idx); setLogicalAddrBits(p.logicalAddrBits); setPageSizeBits(p.pageSizeBits);
    setPageTableInput(p.pageTable.map(v => v == null ? "X" : v).join(" "));
    setAddressInput(String(p.address)); setAnimStep(0);
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 860, margin: "0 auto" }}>
      {/* Concept box */}
      <div style={{ background: t.purpleSoft, border: `1px solid ${t.purple}`, borderRadius: 8, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: t.text, lineHeight: 1.7 }}>
        <strong>Paging:</strong> The OS divides memory into fixed-size <em>pages</em> (logical) and <em>frames</em> (physical) of equal size. A <strong>page table</strong> maps each page number to a frame number. The offset within the page stays unchanged.
      </div>

      {/* Presets */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1 }}>PRESETS:</span>
        {PAGE_PRESETS.map((p, i) => (
          <button key={i} onClick={() => applyPreset(i)} style={{ ...btnBase, background: presetIdx === i ? t.blue : t.panel, color: presetIdx === i ? "#fff" : t.text, borderColor: presetIdx === i ? t.blue : t.border, fontSize: 12, padding: "6px 12px" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Config */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>ADDRESS BITS</label>
          <select value={logicalAddrBits} onChange={e => { setLogicalAddrBits(Number(e.target.value)); setAnimStep(0); }}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text }}>
            {[4, 6, 8].map(b => <option key={b} value={b}>{b} bits ({1 << b} bytes)</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>PAGE SIZE</label>
          <select value={pageSizeBits} onChange={e => { setPageSizeBits(Number(e.target.value)); setAnimStep(0); }}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text }}>
            {[1, 2, 3, 4].filter(b => b < logicalAddrBits).map(b => (
              <option key={b} value={b}>{1 << b} bytes (2^{b})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>LOGICAL ADDRESS</label>
          <input type="number" min={0} max={maxAddr} value={addressInput}
            onChange={e => { setAddressInput(e.target.value); setAnimStep(0); }}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${validAddr ? t.border : t.red}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text, boxSizing: "border-box" }} />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>range: 0–{maxAddr}</div>
        </div>
      </div>

      {/* Page table editor */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>
          PAGE TABLE ({numPages} entries — frame numbers, "X" = not in memory)
        </label>
        <input value={pageTableInput} onChange={e => { setPageTableInput(e.target.value); setAnimStep(0); }}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text, boxSizing: "border-box" }} />
      </div>

      {validAddr ? (
        <>
          {/* Step progress tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", boxShadow: t.shadow }}>
            {["Logical Address", "Split Bits", "Table Lookup", "Physical Address"].slice(0, maxStep + 1).map((label, i) => (
              <button key={i} onClick={() => setAnimStep(i)} style={{
                flex: 1, padding: "11px 4px", background: animStep === i ? t.blue : animStep > i ? t.blueSoft : t.panel,
                border: "none", borderRight: i < maxStep ? `1px solid ${t.border}` : "none",
                color: animStep === i ? "#fff" : t.text, fontFamily: monoFont, fontSize: 11, fontWeight: 700,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {i + 1}. {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Step 1 */}
            <StepCard highlight={animStep === 0}>
              <StepTitle n={1} label="Logical Address" color={t.blue} />
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 11, color: t.muted, marginBottom: 3 }}>Decimal</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: t.blue }}>{logicalAddr}</div></div>
                <div style={{ fontSize: 18, color: t.muted }}>=</div>
                <div><div style={{ fontSize: 11, color: t.muted, marginBottom: 3 }}>Binary ({logicalAddrBits} bits)</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: t.text, background: t.panelAlt, padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}` }}>{binAddr}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>This is the address the process uses — it lives in its own virtual address space.</div>
            </StepCard>

            {/* Step 2 */}
            {animStep >= 1 && (
              <StepCard highlight={animStep === 1}>
                <StepTitle n={2} label="Split into Page Number + Offset" color={t.amber} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>
                  Upper <strong>{pnBits} bits</strong> = page number &nbsp;|&nbsp; Lower <strong>{offsetBitsCount} bits</strong> = byte offset within that page
                </div>
                <div style={{ display: "flex", alignItems: "stretch", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  <div style={{ flex: pnBits, display: "flex", flexDirection: "column" }}>
                    <div style={{ textAlign: "center", padding: "6px 4px", background: t.amberSoft, border: `2px solid ${t.amber}`, borderRight: "none", borderRadius: "6px 0 0 0", fontSize: 11, color: t.amber, fontWeight: 700, letterSpacing: 1 }}>PAGE NUMBER</div>
                    <div style={{ display: "flex" }}>
                      {binPN.split("").map((b, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", padding: "9px 2px", background: t.amberSoft, border: `1px solid ${t.amber}`, borderTop: "none", borderRight: i < pnBits - 1 ? "none" : undefined, fontSize: 16, color: t.text }}>{b}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: offsetBitsCount, display: "flex", flexDirection: "column" }}>
                    <div style={{ textAlign: "center", padding: "6px 4px", background: t.blueSoft, border: `2px solid ${t.blue}`, borderLeft: "none", borderRadius: "0 6px 0 0", fontSize: 11, color: t.blue, fontWeight: 700, letterSpacing: 1 }}>OFFSET</div>
                    <div style={{ display: "flex" }}>
                      {binOffset.split("").map((b, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", padding: "9px 2px", background: t.blueSoft, border: `1px solid ${t.blue}`, borderTop: "none", borderLeft: i === 0 ? "none" : undefined, fontSize: 16, color: t.text }}>{b}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Tag bg={t.amberSoft} border={t.amber} color={t.amber}>Page Number = <strong>{pageNumber}</strong></Tag>
                  <Tag bg={t.blueSoft} border={t.blue} color={t.blue}>Offset = <strong>{offset}</strong></Tag>
                </div>
              </StepCard>
            )}

            {/* Step 3 */}
            {animStep >= 2 && (
              <StepCard highlight={animStep === 2}>
                <StepTitle n={3} label="Page Table Lookup" color={t.green} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>
                  Find page <strong style={{ color: t.amber }}>{pageNumber}</strong> in the page table to get its physical frame:
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {pageTable.slice(0, numPages).map((frame, pg) => {
                    const isTarget = pg === pageNumber;
                    return (
                      <div key={pg} style={{ minWidth: 54, textAlign: "center", borderRadius: 6, border: `2px solid ${isTarget ? (frame === null ? t.red : t.green) : t.border}`, background: isTarget ? (frame === null ? t.redSoft : t.greenSoft) : t.panelAlt, padding: "8px 4px", transform: isTarget ? "scale(1.1)" : "none", transition: "all 0.2s", boxShadow: isTarget ? `0 0 0 3px ${frame === null ? t.redSoft : t.greenSoft}` : "none" }}>
                        <div style={{ fontSize: 10, color: t.muted, marginBottom: 2 }}>Page {pg}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isTarget ? (frame === null ? t.red : t.green) : t.text }}>{frame === null ? "X" : `F${frame}`}</div>
                      </div>
                    );
                  })}
                </div>
                {pageFault
                  ? <div style={{ background: t.redSoft, border: `1px solid ${t.red}`, borderRadius: 8, padding: "12px 16px", color: t.red, fontWeight: 700, fontSize: 13 }}>PAGE FAULT — Page {pageNumber} is not in physical memory. The OS must load it from disk.</div>
                  : <Tag bg={t.greenSoft} border={t.green} color={t.green}>Page <strong>{pageNumber}</strong> → <strong>Frame {frameNumber}</strong></Tag>
                }
              </StepCard>
            )}

            {/* Step 4 */}
            {animStep >= 3 && !pageFault && (
              <StepCard highlight={animStep === 3}>
                <StepTitle n={4} label="Build Physical Address" color={t.purple} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>Replace the page number with the frame number — the offset stays unchanged:</div>
                <div style={{ display: "flex", alignItems: "stretch", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 12px", background: t.amberSoft, border: `2px solid ${t.amber}`, borderRight: "none", borderRadius: "6px 0 0 0", fontSize: 11, color: t.amber, whiteSpace: "nowrap" }}>FRAME {frameNumber}</div>
                    <div style={{ display: "flex" }}>
                      {toBin(frameNumber, Math.max(pnBits, 1)).split("").map((b, i, arr) => (
                        <div key={i} style={{ width: 32, textAlign: "center", padding: "8px 2px", background: t.amberSoft, border: `1px solid ${t.amber}`, borderTop: "none", borderRight: i < arr.length - 1 ? "none" : undefined, fontSize: 15, color: t.text }}>{b}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 12px", background: t.blueSoft, border: `2px solid ${t.blue}`, borderLeft: "none", borderRadius: "0 6px 0 0", fontSize: 11, color: t.blue, whiteSpace: "nowrap" }}>OFFSET {offset}</div>
                    <div style={{ display: "flex" }}>
                      {binOffset.split("").map((b, i) => (
                        <div key={i} style={{ width: 32, textAlign: "center", padding: "8px 2px", background: t.blueSoft, border: `1px solid ${t.blue}`, borderTop: "none", borderLeft: "none", fontSize: 15, color: t.text }}>{b}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ background: t.purpleSoft, border: `2px solid ${t.purple}`, borderRadius: 8, padding: "14px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Physical Address</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: t.purple }}>{physicalAddr}</div>
                  </div>
                  <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.9 }}>
                    <div>Frame {frameNumber} × page size {pageSize} = <strong>{frameNumber * pageSize}</strong></div>
                    <div>+ Offset <strong>{offset}</strong></div>
                    <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>= <strong style={{ color: t.purple }}>{physicalAddr}</strong></div>
                  </div>
                </div>
              </StepCard>
            )}

            {/* Nav */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAnimStep(s => Math.max(0, s - 1))} disabled={animStep === 0} style={{ ...btnBase, opacity: animStep === 0 ? 0.4 : 1 }}>◀ Prev</button>
              <button onClick={() => setAnimStep(s => Math.min(maxStep, s + 1))} disabled={animStep === maxStep} style={{ ...btnBase, opacity: animStep === maxStep ? 0.4 : 1 }}>Next ▶</button>
              <button onClick={() => setAnimStep(0)} style={{ ...btnBase, marginLeft: "auto" }}>↺ Reset</button>
            </div>
          </div>

          {/* Physical memory map */}
          {animStep >= 2 && !pageFault && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, marginBottom: 8 }}>PHYSICAL MEMORY MAP</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {pageTable.slice(0, numPages).map((frame, pg) => {
                  if (frame === null) return null;
                  const isTarget = pg === pageNumber;
                  return (
                    <div key={pg} style={{ minWidth: 76, borderRadius: 6, border: `2px solid ${isTarget ? t.purple : t.border}`, background: isTarget ? t.purpleSoft : t.panelAlt, padding: "10px 8px", textAlign: "center", boxShadow: isTarget ? `0 0 0 3px ${t.purpleSoft}` : "none" }}>
                      <div style={{ fontSize: 10, color: t.muted }}>Frame {frame}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isTarget ? t.purple : t.text }}>Page {pg}</div>
                      <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{frame * pageSize}–{frame * pageSize + pageSize - 1}</div>
                      {isTarget && <div style={{ fontSize: 10, color: t.purple, marginTop: 3, fontWeight: 700 }}>← addr {physicalAddr}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary table */}
          <SummaryTable rows={[
            ["Logical Address", logicalAddr, `binary: ${binAddr}`],
            ["Page Number", pageNumber, `upper ${pnBits} bits`],
            ["Offset", offset, `lower ${offsetBitsCount} bits`],
            ["Frame Number", pageFault ? "PAGE FAULT" : frameNumber, pageFault ? "not in memory!" : `page table[${pageNumber}]`],
            ["Physical Address", pageFault ? "N/A" : physicalAddr, pageFault ? "" : `Frame ${frameNumber} × ${pageSize} + ${offset}`],
          ]} />
        </>
      ) : (
        <div style={{ background: t.redSoft, border: `1px solid ${t.red}`, borderRadius: 8, padding: "12px 16px", color: t.red, fontWeight: 700 }}>
          Invalid address — must be between 0 and {maxAddr}.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — SEGMENTATION TRANSLATION
// ═══════════════════════════════════════════════════════════════════════════════

const SEG_PRESETS = [
  {
    label: "3-segment process",
    segments: [
      { name: "Code",  base: 100, limit: 600 },
      { name: "Data",  base: 800, limit: 400 },
      { name: "Stack", base: 1400, limit: 300 },
    ],
    segNum: 1, offset: 53,
  },
  {
    label: "Out-of-bounds (fault)",
    segments: [
      { name: "Code",  base: 100, limit: 200 },
      { name: "Data",  base: 400, limit: 150 },
    ],
    segNum: 1, offset: 200,
  },
  {
    label: "4-segment full",
    segments: [
      { name: "Code",  base: 50,   limit: 500 },
      { name: "Data",  base: 600,  limit: 300 },
      { name: "Heap",  base: 1000, limit: 500 },
      { name: "Stack", base: 1800, limit: 400 },
    ],
    segNum: 2, offset: 120,
  },
];

const SEG_NAMES = ["Code", "Data", "Heap", "Stack", "BSS"];
const SEG_COLORS = [t.blue, t.green, t.amber, t.purple, t.red];

function SegmentationTab() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [segments, setSegments] = useState(SEG_PRESETS[0].segments.map(s => ({ ...s })));
  const [segNum, setSegNum] = useState(SEG_PRESETS[0].segNum);
  const [offsetInput, setOffsetInput] = useState(String(SEG_PRESETS[0].offset));
  const [animStep, setAnimStep] = useState(0);

  const offset = parseInt(offsetInput);
  const validSeg = segNum >= 0 && segNum < segments.length;
  const validOffset = !isNaN(offset) && offset >= 0;
  const valid = validSeg && validOffset;

  const seg = segments[segNum] || null;
  const segFault = valid && (offset >= seg.limit);
  const physicalAddr = valid && !segFault ? seg.base + offset : null;

  const maxStep = segFault ? 2 : 3;

  function applyPreset(idx) {
    const p = SEG_PRESETS[idx];
    setPresetIdx(idx); setSegments(p.segments.map(s => ({ ...s })));
    setSegNum(p.segNum); setOffsetInput(String(p.offset)); setAnimStep(0);
  }

  function updateSeg(i, field, val) {
    setSegments(prev => prev.map((s, j) => j === i ? { ...s, [field]: val } : s));
    setAnimStep(0);
  }

  function addSegment() {
    if (segments.length >= 5) return;
    setSegments(prev => [...prev, { name: SEG_NAMES[prev.length] || "Seg", base: 2000, limit: 256 }]);
  }

  function removeSegment() {
    if (segments.length <= 1) return;
    const next = segments.slice(0, -1);
    setSegments(next);
    if (segNum >= next.length) setSegNum(next.length - 1);
    setAnimStep(0);
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 860, margin: "0 auto" }}>
      {/* Concept box */}
      <div style={{ background: t.greenSoft, border: `1px solid ${t.green}`, borderRadius: 8, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: t.text, lineHeight: 1.7 }}>
        <strong>Segmentation:</strong> The OS divides a process into <em>variable-size</em> logical segments (Code, Data, Stack, Heap). Each segment has a <strong>base</strong> (where it starts in physical memory) and a <strong>limit</strong> (its size). A logical address is <em>(segment number, offset)</em>. If offset ≥ limit → <strong>segmentation fault</strong>.
      </div>

      {/* Presets */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1 }}>PRESETS:</span>
        {SEG_PRESETS.map((p, i) => (
          <button key={i} onClick={() => applyPreset(i)} style={{ ...btnBase, background: presetIdx === i ? t.blue : t.panel, color: presetIdx === i ? "#fff" : t.text, borderColor: presetIdx === i ? t.blue : t.border, fontSize: 12, padding: "6px 12px" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Segment table editor */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1 }}>SEGMENT TABLE ({segments.length} segments)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={addSegment} disabled={segments.length >= 5} style={{ ...btnBase, padding: "4px 10px", fontSize: 12, opacity: segments.length >= 5 ? 0.4 : 1 }}>+ Add</button>
            <button onClick={removeSegment} disabled={segments.length <= 1} style={{ ...btnBase, padding: "4px 10px", fontSize: 12, opacity: segments.length <= 1 ? 0.4 : 1 }}>− Remove</button>
          </div>
        </div>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 120px", gap: 0, background: t.panelAlt, borderBottom: `1px solid ${t.border}`, padding: "8px 14px", fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1 }}>
            <div>SEG #</div><div>NAME</div><div>BASE</div><div>LIMIT (size)</div>
          </div>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 120px", gap: 0, borderBottom: i < segments.length - 1 ? `1px solid ${t.borderSoft}` : "none", padding: "6px 14px", alignItems: "center", background: i === segNum ? t.blueSoft : "transparent" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: SEG_COLORS[i] }}>Seg {i}</div>
              <input value={seg.name} onChange={e => updateSeg(i, "name", e.target.value)}
                style={{ background: "transparent", border: `1px solid ${t.borderSoft}`, borderRadius: 4, padding: "4px 8px", fontFamily: monoFont, fontSize: 13, color: t.text, width: 90 }} />
              <input type="number" value={seg.base} onChange={e => updateSeg(i, "base", parseInt(e.target.value) || 0)}
                style={{ background: "transparent", border: `1px solid ${t.borderSoft}`, borderRadius: 4, padding: "4px 8px", fontFamily: monoFont, fontSize: 13, color: t.text, width: 90 }} />
              <input type="number" value={seg.limit} onChange={e => updateSeg(i, "limit", parseInt(e.target.value) || 1)}
                style={{ background: "transparent", border: `1px solid ${t.borderSoft}`, borderRadius: 4, padding: "4px 8px", fontFamily: monoFont, fontSize: 13, color: t.text, width: 90 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Logical address input */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>SEGMENT NUMBER</label>
          <select value={segNum} onChange={e => { setSegNum(Number(e.target.value)); setAnimStep(0); }}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text }}>
            {segments.map((s, i) => <option key={i} value={i}>Seg {i} — {s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, display: "block", marginBottom: 6 }}>OFFSET (within segment)</label>
          <input type="number" min={0} value={offsetInput} onChange={e => { setOffsetInput(e.target.value); setAnimStep(0); }}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: `1px solid ${validOffset ? t.border : t.red}`, background: t.panel, fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: t.text, boxSizing: "border-box" }} />
          {valid && seg && <div style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>Segment limit: {seg.limit} bytes (offsets 0–{seg.limit - 1})</div>}
        </div>
      </div>

      {valid && seg ? (
        <>
          {/* Step progress */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden", boxShadow: t.shadow }}>
            {["Logical Address", "Table Lookup", "Bounds Check", "Physical Address"].slice(0, maxStep + 1).map((label, i) => (
              <button key={i} onClick={() => setAnimStep(i)} style={{
                flex: 1, padding: "11px 4px", background: animStep === i ? t.blue : animStep > i ? t.blueSoft : t.panel,
                border: "none", borderRight: i < maxStep ? `1px solid ${t.border}` : "none",
                color: animStep === i ? "#fff" : t.text, fontFamily: monoFont, fontSize: 11, fontWeight: 700,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {i + 1}. {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Step 1: Logical address */}
            <StepCard highlight={animStep === 0}>
              <StepTitle n={1} label="Logical Address" color={t.blue} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ background: t.panelAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: "14px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Logical Address</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: monoFont }}>
                    <span style={{ color: SEG_COLORS[segNum] }}>({segNum}</span>
                    <span style={{ color: t.muted }}>,</span>
                    <span style={{ color: t.blue }}> {offset}</span>
                    <span style={{ color: SEG_COLORS[segNum] }}>)</span>
                  </div>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>segment {segNum}, offset {offset}</div>
                </div>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.7, maxWidth: 300 }}>
                  Unlike paging, a segmentation logical address is a <strong>pair</strong>: the segment number identifies <em>which</em> segment, and the offset is the byte position within it.
                </div>
              </div>
            </StepCard>

            {/* Step 2: Table lookup */}
            {animStep >= 1 && (
              <StepCard highlight={animStep === 1}>
                <StepTitle n={2} label="Segment Table Lookup" color={t.green} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>
                  Find segment <strong style={{ color: SEG_COLORS[segNum] }}>{segNum} ({seg.name})</strong> in the segment table:
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {segments.map((s, i) => {
                    const isTarget = i === segNum;
                    return (
                      <div key={i} style={{ minWidth: 90, textAlign: "center", borderRadius: 6, border: `2px solid ${isTarget ? SEG_COLORS[i] : t.border}`, background: isTarget ? `${SEG_COLORS[i]}18` : t.panelAlt, padding: "10px 8px", transform: isTarget ? "scale(1.06)" : "none", transition: "all 0.2s" }}>
                        <div style={{ fontSize: 10, color: t.muted, marginBottom: 2 }}>Seg {i} — {s.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Base: {s.base}</div>
                        <div style={{ fontSize: 12, color: t.muted }}>Limit: {s.limit}</div>
                      </div>
                    );
                  })}
                </div>
                <Tag bg={`${SEG_COLORS[segNum]}18`} border={SEG_COLORS[segNum]} color={SEG_COLORS[segNum]}>
                  Seg {segNum} ({seg.name}): base = <strong>{seg.base}</strong>, limit = <strong>{seg.limit}</strong>
                </Tag>
              </StepCard>
            )}

            {/* Step 3: Bounds check */}
            {animStep >= 2 && (
              <StepCard highlight={animStep === 2}>
                <StepTitle n={3} label="Bounds Check" color={segFault ? t.red : t.green} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>
                  Is offset <strong>{offset}</strong> within the segment? Check: offset {"<"} limit ({seg.limit})?
                </div>
                {/* Visual comparison */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Offset</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: t.blue, background: t.blueSoft, padding: "10px 20px", borderRadius: 8, border: `2px solid ${t.blue}` }}>{offset}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: segFault ? t.red : t.green }}>{segFault ? "≥" : "<"}</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Limit</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: t.amber, background: t.amberSoft, padding: "10px 20px", borderRadius: 8, border: `2px solid ${t.amber}` }}>{seg.limit}</div>
                  </div>
                  <div style={{ fontSize: 18, color: segFault ? t.red : t.green }}>→</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: segFault ? t.red : t.green, background: segFault ? t.redSoft : t.greenSoft, padding: "10px 16px", borderRadius: 8, border: `2px solid ${segFault ? t.red : t.green}` }}>
                    {segFault ? "FAULT" : "OK"}
                  </div>
                </div>
                {segFault
                  ? <div style={{ background: t.redSoft, border: `1px solid ${t.red}`, borderRadius: 8, padding: "12px 16px", color: t.red, fontWeight: 700, fontSize: 13 }}>
                      SEGMENTATION FAULT — offset {offset} exceeds segment size {seg.limit}. This is an illegal memory access (would read outside the segment).
                    </div>
                  : <div style={{ background: t.greenSoft, border: `1px solid ${t.green}`, borderRadius: 6, padding: "10px 16px", fontSize: 13, color: t.text }}>
                      Access is valid. Physical address = base + offset = {seg.base} + {offset} = <strong style={{ color: t.purple }}>{physicalAddr}</strong>
                    </div>
                }
              </StepCard>
            )}

            {/* Step 4: Physical address */}
            {animStep >= 3 && !segFault && (
              <StepCard highlight={animStep === 3}>
                <StepTitle n={4} label="Compute Physical Address" color={t.purple} />
                <div style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>Add the segment's base address to the offset:</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ background: t.purpleSoft, border: `2px solid ${t.purple}`, borderRadius: 8, padding: "14px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>Physical Address</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: t.purple }}>{physicalAddr}</div>
                  </div>
                  <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.9 }}>
                    <div>Base of {seg.name}: <strong>{seg.base}</strong></div>
                    <div>+ Offset: <strong>{offset}</strong></div>
                    <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>= <strong style={{ color: t.purple }}>{physicalAddr}</strong></div>
                  </div>
                </div>
              </StepCard>
            )}

            {/* Nav */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAnimStep(s => Math.max(0, s - 1))} disabled={animStep === 0} style={{ ...btnBase, opacity: animStep === 0 ? 0.4 : 1 }}>◀ Prev</button>
              <button onClick={() => setAnimStep(s => Math.min(maxStep, s + 1))} disabled={animStep === maxStep} style={{ ...btnBase, opacity: animStep === maxStep ? 0.4 : 1 }}>Next ▶</button>
              <button onClick={() => setAnimStep(0)} style={{ ...btnBase, marginLeft: "auto" }}>↺ Reset</button>
            </div>
          </div>

          {/* Physical memory layout */}
          {animStep >= 2 && !segFault && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, marginBottom: 8 }}>PHYSICAL MEMORY LAYOUT</div>
              <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                {segments.map((s, i) => {
                  const isTarget = i === segNum;
                  const barMax = Math.max(...segments.map(x => x.base + x.limit)) + 200;
                  const startPct = (s.base / barMax) * 100;
                  const widthPct = (s.limit / barMax) * 100;
                  const hitPct = physicalAddr !== null ? ((physicalAddr - s.base) / s.limit) * 100 : 0;
                  return (
                    <div key={i} style={{ padding: "8px 14px", borderBottom: i < segments.length - 1 ? `1px solid ${t.borderSoft}` : "none", background: isTarget ? `${SEG_COLORS[i]}10` : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SEG_COLORS[i] }}>Seg {i} — {s.name}</span>
                        <span style={{ fontSize: 11, color: t.muted }}>{s.base} – {s.base + s.limit - 1}</span>
                      </div>
                      <div style={{ position: "relative", height: 20, background: t.panelAlt, borderRadius: 4, overflow: "hidden", border: `1px solid ${isTarget ? SEG_COLORS[i] : t.borderSoft}` }}>
                        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", background: `${SEG_COLORS[i]}30`, borderRight: `2px solid ${SEG_COLORS[i]}` }} />
                        {isTarget && physicalAddr !== null && (
                          <div style={{ position: "absolute", left: `${hitPct}%`, top: 0, width: 3, height: "100%", background: t.purple, boxShadow: `0 0 6px ${t.purple}` }} />
                        )}
                      </div>
                      {isTarget && physicalAddr !== null && (
                        <div style={{ fontSize: 11, color: t.purple, marginTop: 3, fontWeight: 700 }}>
                          ↑ Physical address {physicalAddr} lands here (offset {offset} into {s.name} segment)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <SummaryTable rows={[
            ["Logical Address", `(${segNum}, ${offset})`, `segment ${segNum}, offset ${offset}`],
            ["Segment Name", seg.name, `seg table[${segNum}].name`],
            ["Base Address", seg.base, `where segment starts in physical memory`],
            ["Limit (size)", seg.limit, `max valid offset is ${seg.limit - 1}`],
            ["Bounds Check", segFault ? "FAIL" : "PASS", segFault ? `${offset} ≥ ${seg.limit}` : `${offset} < ${seg.limit}`],
            ["Physical Address", segFault ? "FAULT" : physicalAddr, segFault ? "illegal access" : `${seg.base} + ${offset}`],
          ]} />
        </>
      ) : (
        <div style={{ background: t.redSoft, border: `1px solid ${t.red}`, borderRadius: 8, padding: "12px 16px", color: t.red, fontWeight: 700 }}>
          Invalid input — check segment number and offset.
        </div>
      )}
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function Tag({ children, bg, border, color }) {
  return (
    <div style={{ display: "inline-block", background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "7px 14px", fontSize: 13, color: color }}>
      {children}
    </div>
  );
}

function SummaryTable({ rows }) {
  return (
    <div style={{ marginTop: 24, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, padding: "16px 20px", boxShadow: t.shadow }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1, marginBottom: 12 }}>TRANSLATION SUMMARY</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: monoFont }}>
        <tbody>
          {rows.map(([k, v, note]) => (
            <tr key={k} style={{ borderBottom: `1px solid ${t.borderSoft}` }}>
              <td style={{ padding: "8px 0", fontWeight: 700, color: t.muted, width: "36%" }}>{k}</td>
              <td style={{ padding: "8px 8px", fontWeight: 700, color: String(v).includes("FAULT") || String(v).includes("FAIL") ? t.red : t.blue, fontSize: 15 }}>{v}</td>
              <td style={{ padding: "8px 0", color: t.muted, fontSize: 11 }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PageTableTranslation() {
  const [activeTab, setActiveTab] = useState("paging");

  return (
    <div style={{ fontFamily: monoFont, background: t.bg, minHeight: "100vh", color: t.text }}>
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "paging" ? <PageTableTab /> : <SegmentationTab />}
    </div>
  );
}
