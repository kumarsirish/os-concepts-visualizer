import { useState, useCallback, useRef, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL = 128;
const PART  = 32;

const PROC_COLORS = {
  A: "#185FA5",
  B: "#0F6E56",
  C: "#534AB7",
  D: "#993C1D",
  E: "#A32D2D",
  F: "#3B6D11",
};

const PROC_SIZES = { A: 30, B: 25, C: 20, D: 15, E: 40, F: 0 };

const EXT_SCRIPT = [
  { label: "Allocate Process A (30 KB)",              action: "alloc",   name: "A", size: 30 },
  { label: "Allocate Process B (25 KB)",              action: "alloc",   name: "B", size: 25 },
  { label: "Allocate Process C (20 KB)",              action: "alloc",   name: "C", size: 20 },
  { label: "Allocate Process D (15 KB)",              action: "alloc",   name: "D", size: 15 },
  { label: "Free Process A → 30 KB gap left behind",  action: "free",    name: "A" },
  { label: "Free Process C → 20 KB gap left behind",  action: "free",    name: "C" },
  { label: "Process E needs 40 KB — FRAGMENTED!",     action: "problem" },
  { label: "Compaction: shift all processes together", action: "compact" },
  { label: "Process E loads (40 KB) — resolved",      action: "done"    },
];

const INT_PROCS = [
  { name: "A", size: 28 },
  { name: "B", size: 14 },
  { name: "C", size: 30 },
  { name: "D", size:  8 },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const pct = (v, base = TOTAL) => `${(v / base) * 100}%`;

function mergeAdjFree(blocks) {
  const arr = [...blocks];
  let i = 0;
  while (i < arr.length - 1) {
    if (arr[i].type === "free" && arr[i + 1].type === "free") {
      const merged = arr[i].size + arr[i + 1].size;
      arr.splice(i, 2, { type: "free", size: merged, label: `Free ${merged} KB` });
    } else {
      i++;
    }
  }
  return arr;
}

function extStats(blocks) {
  const used    = blocks.filter(b => b.type === "used").reduce((s, b) => s + b.size, 0);
  const free    = blocks.filter(b => b.type === "free").reduce((s, b) => s + b.size, 0);
  const gaps    = blocks.filter(b => b.type === "free").map(b => b.size);
  const largest = gaps.length ? Math.max(...gaps) : 0;
  return { used, free, largest, gaps };
}

const initExtState = () => ({
  blocks : [{ type: "free", size: TOTAL, label: "Free 128 KB" }],
  step   : 0,
  log    : ["Ready — click Next Step to begin."],
  phase  : "idle",
});

const initIntState = () => ({
  parts : Array.from({ length: 4 }, (_, i) => ({ id: i, proc: null })),
  step  : 0,
  log   : ["Ready — click Load Process to fill partitions."],
});

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoBox({ kind, children }) {
  const styles = {
    red   : { background: "#FCEBEB", border: "1px solid #E24B4A", color: "#791F1F" },
    amber : { background: "#FAEEDA", border: "1px solid #BA7517", color: "#633806" },
    blue  : { background: "#E6F1FB", border: "1px solid #378ADD", color: "#0C447C" },
    green : { background: "#EAF3DE", border: "1px solid #639922", color: "#27500A" },
  };
  return (
    <div style={{
      borderRadius: 8, padding: "10px 14px", fontSize: 14,
      lineHeight: 1.7, margin: "8px 0", ...styles[kind],
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = "#1E293B" }) {
  return (
    <div style={{
      background: "#F8FAFC", borderRadius: 8, padding: "12px 16px",
      textAlign: "center", border: "1px solid #E2E8F0", flex: 1,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Ruler() {
  const points = [0, 16, 32, 48, 64, 80, 96, 112, 128];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
      {points.map(p => <span key={p}>{p}</span>)}
    </div>
  );
}

function MemBar({ blocks, highlightFree = false }) {
  return (
    <div style={{
      display: "flex", height: 54, borderRadius: 8, overflow: "hidden",
      border: "1px solid #CBD5E1", width: "100%",
    }}>
      {blocks.map((b, i) => {
        const w = pct(b.size);
        const label = b.label || "";
        if (b.type === "used") {
          const color = PROC_COLORS[b.name] || "#185FA5";
          return (
            <div key={i} title={label} style={{
              width: w, background: color, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff",
              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              borderRight: "1px solid rgba(255,255,255,0.2)", transition: "width 0.4s ease",
              flexShrink: 0,
            }}>{label}</div>
          );
        }
        if (b.type === "free") {
          const highlighted = highlightFree && b.highlight;
          return (
            <div key={i} title={label} style={{
              width: w, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "width 0.4s ease",
              background: highlighted ? "#FEE2E2" : "#F1F5F9",
              color      : highlighted ? "#991B1B" : "#64748B",
              border     : highlighted ? "2px dashed #E24B4A" : "none",
              borderRight: highlighted ? undefined : "1px dashed #CBD5E1",
            }}>{label}</div>
          );
        }
        return null;
      })}
    </div>
  );
}

function LogBox({ entries }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);
  return (
    <div ref={ref} style={{
      background: "#F8FAFC", borderRadius: 8, padding: "10px 14px",
      fontSize: 13, lineHeight: 1.8, border: "1px solid #E2E8F0",
      maxHeight: 120, overflowY: "auto", marginTop: 8,
    }}>
      {entries.map((e, i) => (
        <div key={i} style={{
          color: i === entries.length - 1 ? "#1E293B" : "#64748B",
          fontWeight: i === entries.length - 1 ? 600 : 400,
          borderBottom: i < entries.length - 1 ? "1px solid #E2E8F0" : "none",
          padding: "2px 0",
        }}>
          {e}
        </div>
      ))}
    </div>
  );
}

function Badge({ kind, children }) {
  const styles = {
    red  : { background: "#FCEBEB", color: "#A32D2D" },
    amber: { background: "#FAEEDA", color: "#633806" },
    green: { background: "#EAF3DE", color: "#27500A" },
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, marginLeft: 8, ...styles[kind],
    }}>
      {children}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", margin: "14px 0 6px", letterSpacing: "0.01em" }}>
      {children}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#E2E8F0" : "#185FA5",
      color: disabled ? "#94A3B8" : "#fff",
      border: "none", borderRadius: 7, padding: "9px 18px",
      fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s", fontFamily: "inherit",
    }}>
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: "#F1F5F9", color: "#64748B",
      border: "1px solid #E2E8F0", borderRadius: 7, padding: "9px 14px",
      fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    }}>
      {children}
    </button>
  );
}

// ─── Tab 1: External Fragmentation ───────────────────────────────────────────
function ExternalTab() {
  const [state, setState] = useState(initExtState);

  const { blocks, step, log, phase } = state;
  const { used, free, largest, gaps } = extStats(blocks);

  const handleNext = useCallback(() => {
    if (step >= EXT_SCRIPT.length) return;
    const s = EXT_SCRIPT[step];
    setState(prev => {
      let blks = [...prev.blocks.map(b => ({ ...b }))];
      const newLog = [...prev.log, s.label];
      let newPhase = prev.phase;

      if (s.action === "alloc") {
        const fi = blks.findIndex(b => b.type === "free" && b.size >= s.size);
        if (fi !== -1) {
          const rem = blks[fi].size - s.size;
          blks[fi] = { type: "used", size: s.size, label: `Process ${s.name} ${s.size}KB`, name: s.name };
          if (rem > 0) blks.splice(fi + 1, 0, { type: "free", size: rem, label: `Free ${rem}KB` });
        }
      } else if (s.action === "free") {
        const fi = blks.findIndex(b => b.name === s.name);
        if (fi !== -1) {
          const sz = blks[fi].size;
          blks[fi] = { type: "free", size: sz, label: `Free ${sz}KB` };
          blks = mergeAdjFree(blks);
        }
      } else if (s.action === "problem") {
        blks = blks.map(b => b.type === "free" ? { ...b, highlight: true } : b);
        newPhase = "problem";
      } else if (s.action === "compact") {
        const used2 = blks.filter(b => b.type === "used");
        const totalFree = blks.filter(b => b.type === "free").reduce((a, b) => a + b.size, 0);
        blks = [...used2, { type: "free", size: totalFree, label: `Free ${totalFree}KB` }];
        newPhase = "compact";
      } else if (s.action === "done") {
        const fi = blks.findIndex(b => b.type === "free");
        if (fi !== -1) {
          const rem = blks[fi].size - 40;
          blks[fi] = { type: "used", size: 40, label: "Process E  40KB", name: "E" };
          if (rem > 0) blks.push({ type: "free", size: rem, label: `Free ${rem}KB` });
        }
        newPhase = "done";
      }

      return { blocks: blks, step: prev.step + 1, log: newLog, phase: newPhase };
    });
  }, [step]);

  const handleReset = () => setState(initExtState());

  const badge =
    phase === "problem" ? <Badge kind="red">Fragmented!</Badge> :
    phase === "done"    ? <Badge kind="green">Resolved</Badge>  : null;

  return (
    <div>
      <InfoBox kind="red">
        <strong>External Fragmentation</strong> — total free memory is sufficient, but
        scattered in non-contiguous gaps. A new process cannot start because no single
        gap is large enough.
      </InfoBox>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <StatCard label="Total RAM"   value="128 KB" />
        <StatCard label="Used"        value={`${used} KB`}    color="#185FA5" />
        <StatCard label="Free"        value={`${free} KB`}    color="#0F6E56" />
        <StatCard label="Largest Gap" value={`${largest} KB`} color={largest < 40 && phase === "problem" ? "#A32D2D" : "#1E293B"} />
      </div>

      <SectionTitle>RAM — Dynamic Partitioning {badge}</SectionTitle>
      <Ruler />
      <MemBar blocks={blocks} highlightFree={phase === "problem"} />

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 12px", fontSize: 13, color: "#64748B" }}>
        {["A", "B", "C", "D", "E"].map(n => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 13, height: 13, borderRadius: 3, background: PROC_COLORS[n], border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
            Process {n} ({PROC_SIZES[n]} KB)
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 3, background: "#F1F5F9", border: "1px dashed #94A3B8", flexShrink: 0 }} />
          Free gap
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
        <PrimaryBtn onClick={handleNext} disabled={step >= EXT_SCRIPT.length}>
          Next Step → ({step}/{EXT_SCRIPT.length})
        </PrimaryBtn>
        <GhostBtn onClick={handleReset}>↺ Reset</GhostBtn>
      </div>

      <LogBox entries={log} />

      {phase === "problem" && (
        <InfoBox kind="amber">
          <strong>Problem:</strong> Process E needs 40 KB. Total free = {free} KB ✓ but
          largest contiguous gap = {largest} KB ✗ — Process E <strong>cannot start!</strong>
          <br />
          There are {gaps.length} separate gaps: {gaps.map(g => `${g} KB`).join(" + ")} = {free} KB scattered.
        </InfoBox>
      )}
      {(phase === "compact" || phase === "done") && (
        <InfoBox kind="blue">
          <strong>Compaction</strong> — OS physically relocates all processes to one end,
          merging scattered gaps into one large free block. Expensive: requires stopping processes
          and copying memory. After compaction: {largest} KB contiguous free.
        </InfoBox>
      )}
    </div>
  );
}

// ─── Tab 2: Internal Fragmentation ───────────────────────────────────────────
function InternalTab() {
  const [state, setState] = useState(initIntState);
  const { parts, step, log } = state;

  const totalWasted = parts.reduce((s, p) => s + (p.proc ? PART - p.proc.size : 0), 0);
  const filled      = parts.filter(p => p.proc).length;
  const util        = filled > 0
    ? Math.round(((filled * PART - totalWasted) / (filled * PART)) * 100)
    : 100;

  const handleLoad = useCallback(() => {
    if (step >= INT_PROCS.length) return;
    setState(prev => {
      const proc = INT_PROCS[prev.step];
      const newParts = prev.parts.map(p => ({ ...p }));
      const slot = newParts.find(p => !p.proc);
      if (!slot) return prev;
      const waste = PART - proc.size;
      slot.proc = proc;
      return {
        parts: newParts,
        step : prev.step + 1,
        log  : [...prev.log,
          `Load Process ${proc.name} (${proc.size} KB) → Partition ${slot.id + 1}: ` +
          `wastes ${waste} KB (${Math.round((waste / PART) * 100)}% of partition)`],
      };
    });
  }, [step]);

  const handleReset = () => setState(initIntState());

  return (
    <div>
      <InfoBox kind="amber">
        <strong>Internal Fragmentation</strong> — fixed-size partitions pre-divide RAM.
        A process smaller than its partition leaves wasted space <em>inside</em> the partition.
        That space is locked — no other process can use it.
      </InfoBox>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <StatCard label="Total RAM"   value="128 KB" />
        <StatCard label="Wasted"      value={`${totalWasted} KB`} color={totalWasted > 0 ? "#A32D2D" : "#1E293B"} />
        <StatCard label="Utilisation" value={`${util}%`}          color={util < 80 ? "#A32D2D" : "#0F6E56"} />
        <StatCard label="Processes"   value={String(filled)}       color="#185FA5" />
      </div>

      <SectionTitle>
        Fixed Partitions (32 KB each)
        {totalWasted > 0 && <Badge kind="amber">{totalWasted} KB wasted</Badge>}
      </SectionTitle>

      {/* Partition overview blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 12 }}>
        {parts.map(p => {
          const color     = p.proc ? (PROC_COLORS[p.proc.name] || "#185FA5") : "#F1F5F9";
          const textColor = p.proc ? "#FFFFFF" : "#64748B";
          const label     = p.proc ? `Process ${p.proc.name} (${p.proc.size} KB)` : "Empty";
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 50, background: color, border: "2px solid #000",
              fontSize: 14, fontWeight: 600, color: textColor, transition: "background 0.3s",
            }}>
              {label}
            </div>
          );
        })}
      </div>

      <SectionTitle>Partition Detail</SectionTitle>

      {parts.map(p => {
        const proc = p.proc;
        if (!proc) {
          return (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#64748B", marginBottom: 3 }}>
                Partition {p.id + 1} — 32 KB
              </div>
              <div style={{
                display: "flex", height: 38, borderRadius: 6, overflow: "hidden",
                border: "2px solid #000",
              }}>
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: "#94A3B8", background: "#F1F5F9",
                }}>
                  Empty
                </div>
              </div>
            </div>
          );
        }
        const usedPct  = (proc.size / PART) * 100;
        const wastePct = ((PART - proc.size) / PART) * 100;
        const wasteKb  = PART - proc.size;
        const color    = PROC_COLORS[proc.name] || "#185FA5";
        const fragPct  = Math.round((wasteKb / PART) * 100);

        return (
          <div key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 3 }}>
              Partition {p.id + 1} — 32 KB
            </div>
            <div style={{
              display: "flex", height: 38, borderRadius: 6, overflow: "hidden",
              border: "2px solid #000",
            }}>
              <div style={{
                width: `${usedPct}%`, background: color, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, color: "#fff", transition: "width 0.5s ease",
              }}>
                Process {proc.name} {proc.size}KB
              </div>
              {wasteKb > 0 && (
                <div style={{
                  width: `${wastePct}%`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#633806",
                  backgroundImage: "repeating-linear-gradient(45deg,#FAEEDA,#FAEEDA 4px,#FAC775 4px,#FAC775 8px)",
                }}>
                  +{wasteKb}KB wasted
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
              Uses {proc.size} of 32 KB — {fragPct}% internal fragmentation
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
        <PrimaryBtn onClick={handleLoad} disabled={step >= INT_PROCS.length}>
          Load Process →
        </PrimaryBtn>
        <GhostBtn onClick={handleReset}>↺ Reset</GhostBtn>
      </div>

      <LogBox entries={log} />
    </div>
  );
}

function VisitorCount({ page }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    fetch(`https://api.counterapi.dev/v1/os-concepts-lab/${page}/up`)
      .then(r => r.json())
      .then(d => { if (typeof d.count === "number") setCount(d.count); })
      .catch(() => {});
  }, []);
  if (count == null) return null;
  return (
    <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748B", display: "flex", alignItems: "center", gap: 5 }}>
      👁 {count.toLocaleString()} views
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("external");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #EEF2F7;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          color: #1E293B;
        }
        #root { min-height: 100vh; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#0F1C2E",
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}>
        <a href="./" title="Back to Home" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid #2D3E54", background: "#1E2D42", color: "#F1F5F9", textDecoration: "none", flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h2.5a.5.5 0 0 0 .5-.5V11h2v2.5a.5.5 0 0 0 .5.5H11a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6z"/></svg>
        </a>
        <div style={{ fontSize: 28 }}>🧠</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: "#F1F5F9", letterSpacing: "-0.01em", lineHeight: 1.4 }}>
            Memory Fragmentation Simulator
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
            Interactive OS memory management demo
          </div>
        </div>
        <VisitorCount page="memory-fragmentation" />
      </div>

      {/* Tabs */}
      <div style={{
        background: "#1E2D42",
        display: "flex",
        padding: "0 32px",
        gap: 4,
        borderBottom: "1px solid #2D3E54",
      }}>
        {[
          { key: "external", label: "🔴  External Fragmentation" },
          { key: "internal", label: "🟡  Internal Fragmentation" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? "#EEF2F7" : "transparent",
              color    : tab === t.key ? "#0F1C2E"  : "#94A3B8",
              border: "none", cursor: "pointer",
              padding: "13px 20px", fontSize: 13, fontWeight: 600,
              borderRadius: "6px 6px 0 0", fontFamily: "inherit",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {tab === "external" ? <ExternalTab /> : <InternalTab />}
      </div>
    </>
  );
}
