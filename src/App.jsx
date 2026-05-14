import { useState, useEffect, useRef } from "react";

const ALGORITHMS = ["FIFO", "LRU", "OPT", "LFU", "MRU", "CLOCK"];

const ALGO_DESCRIPTIONS = {
  FIFO: "First In First Out — evicts the page that has been in memory the longest.",
  LRU: "Least Recently Used — evicts the page that hasn't been accessed for the longest time.",
  OPT: "Optimal (Bélády's) — evicts the page that won't be used for the longest time in future.",
  LFU: "Least Frequently Used — evicts the page with the fewest total accesses.",
  MRU: "Most Recently Used — evicts the most recently used page (good for cyclic access).",
  CLOCK: "Clock / Second-Chance — approximates LRU using a circular buffer with reference bits.",
};

function runFIFO(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  const queue = [];
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (hit) {
      hits++;
    } else {
      faults++;
      const emptyIndex = mem.indexOf(null);
      if (emptyIndex !== -1) {
        mem[emptyIndex] = page;
        queue.push(emptyIndex);
      } else {
        const victimIndex = queue.shift();
        evictedIndex = victimIndex;
        evicted = mem[victimIndex];
        mem[victimIndex] = page;
        queue.push(victimIndex);
      }
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], queue: [...queue], extra: {} });
  }
  return { steps, hits, faults };
}

function runLRU(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  const order = [];
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (hit) {
      hits++;
      order.splice(order.indexOf(page), 1);
      order.push(page);
    } else {
      faults++;
      const emptyIndex = mem.indexOf(null);
      if (emptyIndex !== -1) {
        mem[emptyIndex] = page;
        order.push(page);
      } else {
        evicted = order.shift();
        evictedIndex = mem.indexOf(evicted);
        mem[evictedIndex] = page;
        order.push(page);
      }
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], extra: { order: [...order] } });
  }
  return { steps, hits, faults };
}

function runOPT(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (hit) {
      hits++;
    } else {
      faults++;
      const emptyIndex = mem.indexOf(null);
      if (emptyIndex !== -1) {
        mem[emptyIndex] = page;
      } else {
        const nextUse = mem.map(p => {
          const idx = pages.indexOf(p, i + 1);
          return idx === -1 ? Infinity : idx;
        });
        const maxIdx = nextUse.indexOf(Math.max(...nextUse));
        evictedIndex = maxIdx;
        evicted = mem[maxIdx];
        mem[maxIdx] = page;
      }
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], extra: {} });
  }
  return { steps, hits, faults };
}

function runLFU(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  const freq = {};
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (!freq[page]) freq[page] = 0;
    if (hit) {
      hits++;
      freq[page]++;
    } else {
      faults++;
      freq[page]++;
      const emptyIndex = mem.indexOf(null);
      if (emptyIndex !== -1) {
        mem[emptyIndex] = page;
      } else {
        let minFreq = Infinity;
        let victim = mem[0];
        for (const p of mem) {
          if ((freq[p] || 0) < minFreq) { minFreq = freq[p] || 0; victim = p; }
        }
        evicted = victim;
        evictedIndex = mem.indexOf(evicted);
        mem[evictedIndex] = page;
      }
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], extra: { freq: { ...freq } } });
  }
  return { steps, hits, faults };
}

function runMRU(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  const order = [];
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (hit) {
      hits++;
      order.splice(order.indexOf(page), 1);
      order.push(page);
    } else {
      faults++;
      const emptyIndex = mem.indexOf(null);
      if (emptyIndex !== -1) {
        mem[emptyIndex] = page;
        order.push(page);
      } else {
        evicted = order.pop();
        evictedIndex = mem.indexOf(evicted);
        mem[evictedIndex] = page;
        order.push(page);
      }
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], extra: { order: [...order] } });
  }
  return { steps, hits, faults };
}

function runCLOCK(pages, frames) {
  const steps = [];
  const mem = new Array(frames).fill(null);
  const bits = new Array(frames).fill(0);
  let ptr = 0;
  let hits = 0, faults = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const hit = mem.includes(page);
    let evicted = null;
    let evictedIndex = null;
    if (hit) {
      hits++;
      bits[mem.indexOf(page)] = 1;
    } else {
      faults++;
      while (bits[ptr] === 1) {
        bits[ptr] = 0;
        ptr = (ptr + 1) % frames;
      }
      if (mem[ptr] !== null) {
        evicted = mem[ptr];
        evictedIndex = ptr;
      }
      mem[ptr] = page;
      bits[ptr] = 1;
      ptr = (ptr + 1) % frames;
    }
    steps.push({ page, hit, evicted, evictedIndex, mem: [...mem], extra: { bits: [...bits], ptr } });
  }
  return { steps, hits, faults };
}

const RUNNERS = { FIFO: runFIFO, LRU: runLRU, OPT: runOPT, LFU: runLFU, MRU: runMRU, CLOCK: runCLOCK };

const PRESETS = {
  Classic: "7 0 1 2 0 3 0 4 2 3 0 3 2",
  Thrashing: "1 2 3 4 1 2 5 4 3 2 5 4",
  Cyclic: "1 2 3 4 5 1 2 3 4 5",
  Locality: "1 1 2 1 3 1 2 1 4 1 2 3",
};

const theme = {
  bg: "#f6f8fb",
  panel: "#ffffff",
  panelAlt: "#f3f6fa",
  border: "#d0d7de",
  borderSoft: "#e5eaf0",
  text: "#000000",
  muted: "#000000",
  blue: "#0969da",
  blueSoft: "#dbeafe",
  green: "#1a7f37",
  greenSoft: "#e7f6ec",
  red: "#cf222e",
  redSoft: "#fdebec",
  amber: "#9a6700",
  shadow: "0 10px 30px rgba(31, 35, 40, 0.08)",
};

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
    <div style={{ marginLeft: "auto", fontSize: 13, color: theme.muted, display: "flex", alignItems: "center", gap: 5 }}>
      👁 {count.toLocaleString()} views
    </div>
  );
}

export default function App() {
  const [pageInput, setPageInput] = useState("7 0 1 2 0 3 0 4 2 3 0 3 2");
  const [frameCount, setFrameCount] = useState(3);
  const [algo, setAlgo] = useState("FIFO");
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [animatedCell, setAnimatedCell] = useState(null);
  const timerRef = useRef(null);

  const pages = pageInput.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
  const summaryStep = step >= 0 && result ? step : -1;

  const summaryStats = summaryStep < 0
    ? { hits: 0, faults: 0 }
    : result.steps.slice(0, summaryStep + 1).reduce((acc, s) => {
        if (s.hit) acc.hits += 1;
        else acc.faults += 1;
        return acc;
      }, { hits: 0, faults: 0 });

  function run() {
    if (pages.length === 0 || frameCount < 1) return;
    const runner = RUNNERS[algo];
    const r = runner(pages, frameCount);
    setResult(r);
    setStep(-1);
    setPlaying(false);
  }

  useEffect(() => { run(); }, [pageInput, frameCount, algo]);

  useEffect(() => {
    if (playing && result) {
      timerRef.current = setInterval(() => {
        setStep(s => {
          if (s >= result.steps.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, result]);

  useEffect(() => {
    if (result && step >= 0) {
      const s = result.steps[step];
      if (!s.hit) setAnimatedCell({ step, index: s.evictedIndex });
      else setAnimatedCell(null);
      const t = setTimeout(() => setAnimatedCell(null), 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const currentStep = result && step >= 0 ? result.steps[step] : null;

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: theme.bg, minHeight: "100vh", color: theme.text, padding: "0 0 40px" }}>
      

      <div style={{ padding: "16px 24px", maxWidth: 900, margin: "0 auto" }}>

        {/* Top bar: home + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${theme.border}` }}>
          <a href="./" title="Back to Home" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.panel, color: theme.text, textDecoration: "none", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h2.5a.5.5 0 0 0 .5-.5V11h2v2.5a.5.5 0 0 0 .5.5H11a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6z"/></svg>
          </a>
          <div>
            <div style={{ fontWeight: 700, fontSize: 28, color: theme.text, letterSpacing: 0.3 }}>Page Replacement Visualizer</div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 1 }}>Step through FIFO, LRU, OPT and more</div>
          </div>
          <VisitorCount page="page-replacement" />
        </div>

        {/* Algorithm selector */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {ALGORITHMS.map(a => (
            <button key={a} onClick={() => setAlgo(a)} title={ALGO_DESCRIPTIONS[a]}
              style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontSize: 15, fontFamily: "inherit", letterSpacing: 0.5, transition: "all 0.15s",
                background: algo === a ? theme.blue : theme.panel,
                borderColor: algo === a ? theme.blue : theme.border,
                color: theme.text,
                fontWeight: 700,
              }}>
              {a}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 15, fontWeight: 700, color: theme.muted, letterSpacing: 1, display: "block", marginBottom: 8 }}>PAGE REFERENCE STRING</label>
            <input value={pageInput} onChange={e => setPageInput(e.target.value)}
              style={{ width: "100%", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "12px 14px", color: theme.text, fontFamily: "inherit", fontSize: 15, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
              placeholder="e.g. 1 2 3 4 1 2 5" />
          </div>
          <div>
            <label style={{ fontSize: 15, fontWeight: 700, color: theme.muted, letterSpacing: 1, display: "block", marginBottom: 8 }}>FRAMES</label>
            <input type="number" min={1} max={8} value={frameCount} onChange={e => setFrameCount(parseInt(e.target.value) || 3)}
              style={{ width: 88, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "12px 14px", color: theme.text, fontFamily: "inherit", fontSize: 15, fontWeight: 700, outline: "none", textAlign: "center" }} />
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.muted, letterSpacing: 1 }}>PRESETS:</span>
          {Object.entries(PRESETS).map(([k, v]) => (
            <button key={k} onClick={() => setPageInput(v)}
              style={{ padding: "5px 12px", borderRadius: 4, border: `1px solid ${theme.border}`, background: theme.panel, color: theme.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{k}</button>
          ))}
        </div>

        {result && (
          <>
            {/* Playback controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, flexWrap: "wrap", boxShadow: theme.shadow }}>
              <button onClick={() => setStep(-1)} style={btnStyle}>⏮</button>
              <button onClick={() => setStep(s => Math.max(-1, s - 1))} style={btnStyle}>◀</button>
              <button onClick={() => setPlaying(p => !p)} style={{ ...btnStyle, background: playing ? theme.redSoft : theme.greenSoft, borderColor: playing ? theme.red : theme.green, color: theme.text, width: 82 }}>
                {playing ? "⏸ PAUSE" : "▶ PLAY"}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setStep(-1);
                  setAnimatedCell(null);
                }}
                style={{ ...btnStyle, background: theme.panel, borderColor: theme.border, width: 88 }}
              >
                ↺ RESET
              </button>
              <button onClick={() => setStep(s => Math.min(result.steps.length - 1, s + 1))} style={btnStyle}>▶</button>
              <button onClick={() => setStep(result.steps.length - 1)} style={btnStyle}>⏭</button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted }}>SPEED</span>
                <input type="range" min={100} max={1200} step={100} value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  style={{ width: 90, accentColor: theme.blue }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted, minWidth: 54 }}>{speed} ms</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted, minWidth: 36 }}>{step + 1}/{result.steps.length}</span>
              </div>
            </div>

            {/* Current step callout */}
            {currentStep && (
              <div style={{ marginBottom: 16, background: theme.panel, border: `1px solid ${currentStep.hit ? theme.green : theme.red}`, borderRadius: 8, padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: theme.shadow }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: currentStep.hit ? theme.greenSoft : theme.redSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {currentStep.hit ? "✓" : "✗"}
                </div>
                <div>
                  <div style={{ fontSize: 15, color: theme.text, fontWeight: 700, letterSpacing: 1 }}>
                    {currentStep.hit ? "PAGE HIT" : "PAGE FAULT"}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.muted, marginTop: 2 }}>
                    Page <span style={{ color: theme.text, fontWeight: 700 }}>{currentStep.page}</span>
                    {!currentStep.hit && currentStep.evicted != null && (
                      <> → evicted <span style={{ color: theme.text, fontWeight: 700 }}>{currentStep.evicted}</span>, loaded <span style={{ color: theme.text, fontWeight: 700 }}>{currentStep.page}</span></>
                    )}
                    {!currentStep.hit && currentStep.evicted == null && (
                      <> → loaded into empty frame</>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline grid */}
            <TimelineGrid pages={pages} steps={result.steps} currentStep={step} frameCount={frameCount} flashCell={animatedCell} />

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
              {[
                { label: "TOTAL PAGES", val: pages.length, color: theme.muted },
                { label: "PAGE FAULTS", val: summaryStats.faults, color: theme.red },
                { label: "PAGE HITS", val: summaryStats.hits, color: theme.green },
                { label: "HIT RATE", val: summaryStep < 0 ? "0.0%" : `${((summaryStats.hits / pages.length) * 100).toFixed(1)}%`, color: theme.blue },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "12px 14px", textAlign: "center", boxShadow: theme.shadow }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.muted, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 12px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.panelAlt,
  color: theme.muted, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

function TimelineGrid({ pages, steps, currentStep, frameCount, flashCell }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current && currentStep >= 0) {
      const cells = containerRef.current.querySelectorAll("[data-idx]");
      const active = containerRef.current.querySelector(`[data-idx="${currentStep}"]`);
      if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentStep]);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: theme.muted, letterSpacing: 1, marginBottom: 8 }}>REFERENCE TIMELINE</div>
      <div ref={containerRef} style={{ overflowX: "auto", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "14px 12px", boxShadow: theme.shadow }}>
        <div style={{ display: "flex", gap: 8, minWidth: "fit-content", marginBottom: 8, alignItems: "flex-start" }}>
          <div style={{ width: 34, flex: "0 0 34px" }}>
            <div style={{ height: 34, marginBottom: 4 }} />
            {Array.from({ length: frameCount }).map((_, fi) => (
              <div key={fi} style={{ height: 28, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: theme.text, fontWeight: 700 }}>
                F{fi + 1}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, minWidth: "fit-content" }}>
          {pages.map((p, i) => {
            const s = steps[i];
            const isActive = i === currentStep;
            const isFuture = i > currentStep;
            return (
              <div key={i} data-idx={i} style={{ width: 38, textAlign: "center" }}>
                {/* Page number */}
                <div style={{ width: 38, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6,
                  background: isActive ? theme.blue : isFuture ? theme.panel : theme.panelAlt,
                  border: `1px solid ${isActive ? theme.blue : theme.border}`,
                  color: theme.text,
                  fontWeight: 700, fontSize: 14, transition: "all 0.2s" }}>
                  {p}
                </div>
                {/* Hit/fault indicator */}
                <div style={{ height: 6, marginTop: 4, borderRadius: 3,
                  background: isFuture ? "transparent" : s?.hit ? theme.green : theme.red,
                  transition: "background 0.2s", border: isFuture ? `1px solid ${theme.border}` : "none" }} />
                {/* Frame rows */}
                {Array.from({ length: frameCount }).map((_, fi) => {
                  const val = s?.mem[fi];
                  const displayVal = isFuture ? null : val;
                  const isNew = !s?.hit && s?.page === val;
                  const isFlash = flashCell && flashCell.step === i && flashCell.index === fi;
                  return (
                    <div key={fi} style={{ width: 38, marginTop: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className={isFlash ? "flash-replaced-cell" : ""} style={{ width: 38, height: 28, display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                        borderRadius: 4, fontSize: 13,
                        background: isFlash ? theme.redSoft : isFuture ? theme.panel : displayVal != null ? (isNew && !s?.hit ? theme.blueSoft : theme.panelAlt) : "#fdfefe",
                        border: `1px solid ${isFlash ? theme.red : isFuture ? theme.borderSoft : displayVal != null ? (isNew && !s?.hit ? theme.blue : theme.border) : theme.borderSoft}`,
                        boxShadow: isFlash ? `0 0 0 3px ${theme.redSoft}, 0 0 18px rgba(207, 34, 46, 0.55)` : "none",
                        color: theme.text,
                        fontWeight: isNew ? 700 : 400, transition: "all 0.2s" }}>
                        {displayVal != null ? displayVal : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.borderSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: theme.green }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted }}>Hit</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: theme.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted }}>Fault</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: theme.blueSoft, border: `1px solid ${theme.blue}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.muted }}>Newly loaded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
