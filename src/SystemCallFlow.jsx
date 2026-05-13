import { useState, useEffect, useRef } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const th = {
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
  shadow: "0 4px 20px rgba(31,35,40,0.10)",
};

const mono = "'Courier New', monospace";

// ─── Zones ────────────────────────────────────────────────────────────────────
const ZONES = {
  user:     { label: "USER SPACE",   ring: "Ring 3", bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
  kernel:   { label: "KERNEL SPACE", ring: "Ring 0", bg: "#fffbeb", border: "#fcd34d", color: "#92400e" },
  hardware: { label: "HARDWARE",     ring: "",        bg: "#f0fdf4", border: "#86efac", color: "#166534" },
};

// ─── Layer definitions ────────────────────────────────────────────────────────
const LAYERS = [
  { id: "user-prog",   zone: "user",     icon: "💻", label: "Your Program",            sub: "Application code — user space" },
  { id: "libc",        zone: "user",     icon: "📚", label: "C Library  (glibc)",       sub: "Syscall wrapper + ABI bridge" },
  { id: "kernel-entry",zone: "kernel",   icon: "🔑", label: "Kernel Entry Point",        sub: "Syscall dispatch table" },
  { id: "sys-read",    zone: "kernel",   icon: "⚙️", label: "sys_read() Handler",        sub: "fd validation + permissions" },
  { id: "vfs",         zone: "kernel",   icon: "🗂️", label: "Virtual File System (VFS)", sub: "Abstract FS interface + page cache" },
  { id: "fs",          zone: "kernel",   icon: "📁", label: "FS Driver  (ext4/fat32)",   sub: "Maps file offsets → disk blocks" },
  { id: "block-io",    zone: "kernel",   icon: "📦", label: "Block I/O Layer",            sub: "I/O scheduler + request queue" },
  { id: "dev-driver",  zone: "kernel",   icon: "🔌", label: "Device Driver (SATA/NVMe)", sub: "Hardware command interface" },
  { id: "hdd",         zone: "hardware", icon: "💿", label: "Hard Disk / SSD",           sub: "Physical data storage" },
];

// ─── Steps ────────────────────────────────────────────────────────────────────
// Each step: active layer ids, direction (down|up), phase label, title, code, detail, modeSwitch
const STEPS = [
  {
    ids: ["user-prog"],
    dir: "down", phase: "request",
    title: "① Program calls read()",
    code:
`int fd = open("data.txt", O_RDONLY);
char buf[1024];

// This looks like a normal function call...
ssize_t n = read(fd, buf, 1024);
//           ↑ but it needs OS help!`,
    detail: "Your C program calls read(). It looks like a regular function call, but accessing a file on disk requires OS privileges. The C library will translate this into a kernel system call.",
    crossing: null,
  },
  {
    ids: ["libc"],
    dir: "down", phase: "request",
    title: "② libc prepares the system call",
    code:
`// Inside glibc — invisible to your code:
mov rax, 0       ; syscall number: sys_read = 0
mov rdi, fd      ; arg1: file descriptor
mov rsi, buf     ; arg2: pointer to your buffer
mov rdx, 1024    ; arg3: number of bytes

syscall           ; ← CPU trap instruction 🚀`,
    detail: "glibc loads the syscall number (0 = sys_read on Linux x86-64) and arguments into CPU registers, then executes the SYSCALL instruction — a special CPU instruction that triggers a controlled jump into the kernel.",
    crossing: null,
  },
  {
    ids: ["kernel-entry"],
    dir: "down", phase: "request",
    title: "③ CPU switches to Kernel Mode",
    code:
`// Hardware does this automatically on SYSCALL:
//  1. Save user rip, rsp → kernel stack
//  2. Load kernel stack pointer (MSR_LSTAR)
//  3. Privilege:  Ring 3 → Ring 0  ← mode switch!
//  4. Jump to kernel entry: entry_SYSCALL_64()

// Kernel reads syscall number from rax:
sys_call_table[0]  →  sys_read  ✓`,
    detail: "The SYSCALL instruction causes the CPU to switch from Ring 3 (user mode) to Ring 0 (kernel mode). The kernel now has full hardware access. Your process's state is saved, and the kernel dispatches to sys_read.",
    crossing: "user→kernel",
  },
  {
    ids: ["sys-read"],
    dir: "down", phase: "request",
    title: "④ sys_read() validates the request",
    code:
`// kernel/fs/read_write.c
SYSCALL_DEFINE3(read, unsigned int, fd,
                char __user *, buf, size_t, count)
{
    struct fd f = fdget_pos(fd);   // look up fd table
    if (!f.file) return -EBADF;   // bad descriptor!
    // check count limits, file permissions...
    ret = vfs_read(f.file, buf, count, &pos);
    return ret;
}`,
    detail: "sys_read looks up the file descriptor in your process's fd table, validates arguments, and checks that the file is open for reading. Then it calls into the VFS layer.",
    crossing: null,
  },
  {
    ids: ["vfs"],
    dir: "down", phase: "request",
    title: "⑤ VFS checks the page cache",
    code:
`// Virtual File System provides uniform API
// for ALL filesystem types (ext4, fat32, ntfs…)

ssize_t vfs_read(struct file *file, ...) {
    // 🔍 First: check page cache (disk data in RAM)
    page = find_get_page(inode->i_mapping, index);
    if (PageUptodate(page)) {
        copy_to_user(buf, page_data, count);
        return count;  // ✅ Cache HIT — no disk I/O!
    }
    // ❌ Cache MISS — must read from disk
    file->f_op->read_iter(iocb, iter);
}`,
    detail: "VFS is the kernel's abstract layer that works with any filesystem. It first checks the page cache — if this file block was recently read, it's already in RAM and we return immediately without touching the disk. On a cache miss, we continue down.",
    crossing: null,
  },
  {
    ids: ["fs"],
    dir: "down", phase: "request",
    title: "⑥ ext4 maps file offset → disk block",
    code:
`// ext4 translates logical file offset
// to a physical disk block number

ext4_get_block(inode, file_offset, &map);
// file offset 0 → disk block 82053
// Uses inode's extent tree to find the mapping

// Block not in cache → create read request
struct bio *bio = bio_alloc(GFP_NOIO, 1);
bio->bi_iter.bi_sector = block_nr * 8; // sectors`,
    detail: "The ext4 driver reads the file's inode (metadata) to find which disk block stores the data at the requested file offset. It then creates a bio (block I/O) request for that specific disk sector.",
    crossing: null,
  },
  {
    ids: ["block-io"],
    dir: "down", phase: "request",
    title: "⑦ Block I/O layer queues the request",
    code:
`// Bio submitted to the I/O scheduler
submit_bio(bio);

// I/O scheduler (e.g., mq-deadline, bfq):
// • Merges adjacent requests (fewer seeks)
// • Reorders requests (elevator algorithm)
// • Optimizes for throughput or latency

// Your process is put to SLEEP here 💤
// CPU runs other processes while waiting!
schedule();   // ← context switch`,
    detail: "The block layer's I/O scheduler queues and potentially reorders requests to minimize disk head movement. Your process is then put to sleep — the CPU is free to run other processes while the slow disk I/O happens.",
    crossing: null,
  },
  {
    ids: ["dev-driver"],
    dir: "down", phase: "request",
    title: "⑧ Device driver commands the hardware",
    code:
`// SATA/AHCI driver sends ATA command
ahci_qc_issue(qc):
    // Write command to hardware registers:
    writel(PORT_CMD_FIS_ON, port_mmio + PORT_CMD);
    // Set up DMA descriptor table:
    //   src: disk sector 82053
    //   dst: kernel page cache buffer @ 0xffff...
    // Disk controller will DMA data to that buffer
    // WITHOUT involving the CPU (Direct Memory Access)`,
    detail: "The device driver translates the bio into actual hardware commands written to the disk controller's memory-mapped registers. DMA is configured so the disk can write data directly into the kernel page cache buffer without CPU involvement.",
    crossing: null,
  },
  {
    ids: ["hdd"],
    dir: "down", phase: "request",
    title: "⑨ HDD: Physical seek, read & DMA",
    code:
`// This is HARDWARE — no code runs here!

Timeline:
  0ms    Disk controller receives command
  ~1ms   Actuator arm seeks to track 2847
  ~4ms   Wait for sector to rotate under head
           (avg. rotational latency @ 7200 RPM)
  ~0.5ms Read sectors magnetically
  ~0.1ms DMA: transfer 4096 bytes → kernel RAM
           (CPU is not involved in this transfer)
  ✓ Done → raise hardware INTERRUPT (IRQ14)`,
    detail: "The HDD physically moves its read head to the right track and waits for the correct sector to rotate beneath it (~10ms total). The data is read magnetically and DMA'd directly into the kernel's page cache buffer. Then the disk controller raises a hardware interrupt.",
    crossing: null,
  },
  // ── return path ──
  {
    ids: ["dev-driver"],
    dir: "up", phase: "response",
    title: "⑩ Hardware interrupt: disk is done!",
    code:
`// IRQ14 fires → CPU runs interrupt handler
irqreturn_t ahci_interrupt(int irq, void *dev) {
    // Acknowledge the hardware interrupt
    status = readl(port_mmio + PORT_IRQ_STAT);
    writel(status, port_mmio + PORT_IRQ_STAT);

    // DMA transfer is complete ✅
    // Data is now in kernel page cache!
    bio_endio(bio);    // mark bio complete
    // Wake up the process that was sleeping 💡
    wake_up(&wait_queue);
}`,
    detail: "The disk controller raises IRQ14. The CPU interrupts its current task and runs the driver's interrupt handler, which acknowledges the interrupt, confirms the DMA transfer succeeded, and wakes up your sleeping process.",
    crossing: null,
  },
  {
    ids: ["block-io", "fs", "vfs"],
    dir: "up", phase: "response",
    title: "⑪ Data is in kernel page cache",
    code:
`// Process wakes up — data is in kernel RAM
// but NOT yet in your user buffer!

void read_endio(struct bio *bio) {
    struct page *page = bio->bi_io_vec[0].bv_page;
    SetPageUptodate(page);   // mark page valid
    unlock_page(page);       // release page lock
}

// Page cache: kernel RAM acting as disk cache
// Address: 0xffff888012340000 (kernel virtual)
// Size: 4096 bytes (one page)
// Content: your file data ✅`,
    detail: "The DMA transfer put the disk data into the kernel's page cache — a region of kernel RAM. The block layer, FS driver, and VFS all mark the request as complete. But the data is in kernel space — your program still can't see it.",
    crossing: null,
  },
  {
    ids: ["sys-read", "kernel-entry"],
    dir: "up", phase: "response",
    title: "⑫ Copy to user buffer + return from kernel",
    code:
`// Back in sys_read — copy kernel → user space
// copy_to_user also validates the user pointer!
unsigned long left = copy_to_user(
    user_buf,          // your buffer (user space)
    page_cache_ptr,    // kernel page cache
    1024               // bytes to copy
);

// sys_read returns the byte count
return 1024;

// Kernel restores saved user registers
// Executes SYSRET: Ring 0 → Ring 3  ← mode switch!`,
    detail: "sys_read copies the data from the kernel page cache into your user-space buffer using copy_to_user (which also validates the pointer). Then the kernel restores your CPU registers and executes SYSRET — the CPU privilege level drops from Ring 0 back to Ring 3.",
    crossing: "kernel→user",
  },
  {
    ids: ["libc", "user-prog"],
    dir: "up", phase: "response",
    title: "⑬ Back in user space — data received!",
    code:
`// libc returns the result to your code:
ssize_t n = read(fd, buf, 1024);
//  n = 1024  (bytes successfully read)

// buf[] now contains the file contents! 🎉
printf("Read %zd bytes:\\n%.*s\\n", n, (int)n, buf);

// Total round-trip time:
//   ~10ms (HDD) or ~0.1ms (SSD)
//   ~2 context switches (user↔kernel)
//   ~1 interrupt`,
    detail: "read() returns 1024 — the number of bytes read. Your buffer now contains the file data. The complete round trip: user space → kernel → disk → kernel (page cache) → user space is finished!",
    crossing: null,
  },
];

// ─── Helper: group layers by zone ─────────────────────────────────────────────
const ZONE_ORDER = ["user", "kernel", "hardware"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HomeButton() {
  return (
    <a href="./" title="Back to Home" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 34, height: 34, borderRadius: 8, border: `1px solid ${th.border}`,
      background: th.panel, color: th.text, textDecoration: "none", flexShrink: 0,
    }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 8h1v5a1 1 0 0 0 1 1h2.5a.5.5 0 0 0 .5-.5V11h2v2.5a.5.5 0 0 0 .5.5H11a1 1 0 0 0 1-1V8h1a.5.5 0 0 0 .354-.854l-6-6z"/>
      </svg>
    </a>
  );
}

// Animated packet badge moving down/up
function PacketBadge({ dir, phase }) {
  const isRequest = phase === "request";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 12,
      background: isRequest ? th.blueSoft : th.greenSoft,
      border: `1px solid ${isRequest ? th.blue : th.green}`,
      fontSize: 11, fontWeight: 700, color: isRequest ? th.blue : th.green,
      fontFamily: mono, letterSpacing: 0.5,
    }}>
      {isRequest ? "▼" : "▲"} {isRequest ? "REQUEST" : "DATA"}
    </div>
  );
}

// The mode-switch divider between user and kernel zones
function ModeSwitchDivider({ crossing, flashKey }) {
  const active = crossing != null;
  return (
    <div key={flashKey} style={{
      margin: "4px 0",
      padding: "7px 14px",
      background: active ? "#fef9c3" : th.panelAlt,
      border: `2px dashed ${active ? "#ca8a04" : th.border}`,
      borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "background 0.4s, border-color 0.4s",
      animation: active ? "modePulse 0.6s ease" : "none",
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#92400e" : th.muted, letterSpacing: 1, fontFamily: mono }}>
        ⚡ CPU MODE SWITCH
      </span>
      <span style={{ fontSize: 11, color: active ? "#92400e" : th.muted, fontFamily: mono }}>
        {crossing === "user→kernel" ? "Ring 3 → Ring 0 (privilege escalation)" :
         crossing === "kernel→user" ? "Ring 0 → Ring 3 (SYSRET)" :
         "Ring 3 ↔ Ring 0 boundary"}
      </span>
    </div>
  );
}

// Hardware boundary divider
function HwDivider() {
  return (
    <div style={{
      margin: "4px 0", padding: "7px 14px",
      background: th.panelAlt, border: `2px dashed ${th.border}`,
      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: th.muted, letterSpacing: 1, fontFamily: mono }}>🔩 HARDWARE BOUNDARY</span>
      <span style={{ fontSize: 11, color: th.muted, fontFamily: mono }}>Software ↔ Physical device</span>
    </div>
  );
}

// Single layer card
function LayerCard({ layer, active, dir, phase, prevZone }) {
  const zone = ZONES[layer.zone];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      borderRadius: 8,
      border: `2px solid ${active ? (phase === "request" ? th.blue : th.green) : zone.border}`,
      background: active ? (phase === "request" ? th.blueSoft : th.greenSoft) : zone.bg,
      boxShadow: active ? `0 0 0 3px ${phase === "request" ? "#bfdbfe" : "#bbf7d0"}, ${th.shadow}` : "none",
      transition: "all 0.3s ease",
      transform: active ? "scale(1.012)" : "scale(1)",
      position: "relative",
    }}>
      {/* Direction indicator on active layer */}
      {active && (
        <div style={{
          position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)",
          width: 10, height: 10, borderRadius: "50%",
          background: phase === "request" ? th.blue : th.green,
          boxShadow: `0 0 8px ${phase === "request" ? th.blue : th.green}`,
          animation: "pulse 0.8s ease-in-out infinite",
        }} />
      )}
      <div style={{ fontSize: 20, flexShrink: 0 }}>{layer.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: active ? (phase === "request" ? th.blue : th.green) : th.text, transition: "color 0.3s" }}>
          {layer.label}
        </div>
        <div style={{ fontSize: 11, color: th.muted, marginTop: 1 }}>{layer.sub}</div>
      </div>
      {active && (
        <div style={{ flexShrink: 0 }}>
          <PacketBadge dir={dir} phase={phase} />
        </div>
      )}
    </div>
  );
}

// Left panel: full layer stack
function LayerStack({ step }) {
  const currentStep = STEPS[step];
  const activeIds = new Set(currentStep.ids);

  // Track which crossing is happening
  const crossing = currentStep.crossing;
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (crossing) setFlashKey(k => k + 1);
  }, [crossing, step]);

  let prevZone = null;
  const elements = [];

  for (const zoneName of ZONE_ORDER) {
    const zone = ZONES[zoneName];
    const zoneLayers = LAYERS.filter(l => l.zone === zoneName);

    // Mode-switch divider before kernel zone
    if (zoneName === "kernel") {
      elements.push(
        <ModeSwitchDivider
          key="mode-switch"
          crossing={crossing?.includes("kernel") ? crossing : null}
          flashKey={crossing ? flashKey : 0}
        />
      );
    }
    // Hardware divider before hardware zone
    if (zoneName === "hardware") {
      elements.push(<HwDivider key="hw-divider" />);
    }

    elements.push(
      <div key={zoneName} style={{
        background: zone.bg,
        border: `1px solid ${zone.border}`,
        borderRadius: 10, padding: "10px 10px 10px 20px", marginBottom: 4,
      }}>
        {/* Zone label */}
        <div style={{ fontSize: 11, fontWeight: 700, color: zone.color, letterSpacing: 1.2, marginBottom: 8, fontFamily: mono, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: zone.color, display: "inline-block" }} />
          {zone.label} {zone.ring && <span style={{ fontWeight: 400, color: th.muted }}>({zone.ring})</span>}
        </div>
        {/* Layer cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {zoneLayers.map(layer => (
            <LayerCard
              key={layer.id}
              layer={layer}
              active={activeIds.has(layer.id)}
              dir={currentStep.dir}
              phase={currentStep.phase}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: "0 0 52%", display: "flex", flexDirection: "column", gap: 0 }}>
      {elements}
    </div>
  );
}

// Right panel: step explanation + code
function StepDetail({ step, total, onPrev, onNext, playing, onPlay }) {
  const s = STEPS[step];
  const isRequest = s.phase === "request";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Progress */}
      <div style={{ background: th.panel, border: `1px solid ${th.border}`, borderRadius: 8, padding: "12px 16px", boxShadow: th.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: th.muted, letterSpacing: 1, fontFamily: mono }}>STEP {step + 1} / {total}</span>
          <PacketBadge dir={s.dir} phase={s.phase} />
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: th.panelAlt, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: isRequest ? th.blue : th.green, width: `${((step + 1) / total) * 100}%`, transition: "width 0.3s ease" }} />
        </div>
        {/* Phase label */}
        <div style={{ fontSize: 11, color: th.muted, marginTop: 6, fontFamily: mono }}>
          Phase: <strong style={{ color: isRequest ? th.blue : th.green }}>{isRequest ? "→ Request (going down)" : "← Response (coming up)"}</strong>
        </div>
      </div>

      {/* Title + detail */}
      <div style={{ background: th.panel, border: `1px solid ${th.border}`, borderRadius: 8, padding: "14px 16px", boxShadow: th.shadow }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 10, fontFamily: mono }}>{s.title}</div>
        <div style={{ fontSize: 13, color: th.muted, lineHeight: 1.75 }}>{s.detail}</div>
        {s.crossing && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#fef9c3", border: "1px solid #ca8a04", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#92400e", fontFamily: mono }}>
            ⚡ CPU mode switch: {s.crossing === "user→kernel" ? "User Mode → Kernel Mode" : "Kernel Mode → User Mode"}
          </div>
        )}
      </div>

      {/* Code block */}
      <div style={{ background: "#1e1e2e", border: `1px solid #3d3d5c`, borderRadius: 8, overflow: "hidden", boxShadow: th.shadow }}>
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #3d3d5c", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: "#888", fontFamily: mono }}>
            {isRequest ? "↓ system call path" : "↑ return path"}
          </span>
        </div>
        <pre style={{ margin: 0, padding: "14px 16px", fontFamily: mono, fontSize: 12, lineHeight: 1.75, color: "#cdd6f4", overflowX: "auto", whiteSpace: "pre" }}>
          {s.code}
        </pre>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onPrev} disabled={step === 0} style={{
          ...navBtn, opacity: step === 0 ? 0.4 : 1,
        }}>◀ Prev</button>
        <button onClick={onPlay} style={{
          ...navBtn,
          background: playing ? th.redSoft : th.greenSoft,
          borderColor: playing ? th.red : th.green,
          color: th.text, minWidth: 90,
        }}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={onNext} disabled={step === total - 1} style={{
          ...navBtn, opacity: step === total - 1 ? 0.4 : 1,
        }}>Next ▶</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: th.muted, fontFamily: mono }}>
          {step < 8 ? "→ request" : "← response"}
        </span>
      </div>
    </div>
  );
}

const navBtn = {
  padding: "8px 14px", borderRadius: 6, border: `1px solid ${th.border}`,
  background: th.panelAlt, color: th.text, fontFamily: mono,
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};

// ─── Syscall selector ─────────────────────────────────────────────────────────
const SYSCALL_EXAMPLES = [
  { label: "read()", num: 0,  desc: "Read bytes from a file descriptor" },
  { label: "write()", num: 1, desc: "Write bytes to a file descriptor" },
  { label: "open()", num: 2,  desc: "Open or create a file, returns fd" },
  { label: "close()", num: 3, desc: "Close a file descriptor" },
];

function SyscallBanner({ selected, onSelect }) {
  return (
    <div style={{ background: th.panel, border: `1px solid ${th.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, boxShadow: th.shadow }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: th.muted, letterSpacing: 1, marginBottom: 10, fontFamily: mono }}>DEMO SYSCALL</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SYSCALL_EXAMPLES.map(sc => (
          <button key={sc.label} onClick={() => onSelect(sc)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${selected.label === sc.label ? th.blue : th.border}`,
            background: selected.label === sc.label ? th.blueSoft : th.panelAlt,
            color: selected.label === sc.label ? th.blue : th.text,
            fontFamily: mono, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            {sc.label}
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: selected.label === sc.label ? th.blue : th.muted }}>
              #{sc.num}
            </span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: th.muted, marginTop: 8, fontFamily: mono }}>
        <strong style={{ color: th.text }}>rax = {selected.num}</strong> — {selected.desc} &nbsp;|&nbsp; All file syscalls follow the same kernel path shown below.
      </div>
    </div>
  );
}

// ─── Mini call stack tracker ──────────────────────────────────────────────────
function CallStack({ step }) {
  const s = STEPS[step];
  // Build a virtual call stack from current state
  const requestStack = LAYERS
    .filter(l => {
      const layerStep = STEPS.findIndex(st => st.ids.includes(l.id) && st.dir === "down");
      const isReturned = s.dir === "up" && STEPS.slice(0, step + 1).some(st => st.ids.includes(l.id) && st.dir === "up" && STEPS.indexOf(st) <= step);
      return layerStep !== -1 && layerStep <= step && !isReturned;
    })
    .reverse();

  if (requestStack.length === 0) return null;

  return (
    <div style={{ background: th.panel, border: `1px solid ${th.border}`, borderRadius: 8, padding: "12px 16px", boxShadow: th.shadow }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: th.muted, letterSpacing: 1, marginBottom: 8, fontFamily: mono }}>CALL STACK (simplified)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {requestStack.map((l, i) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: `${(i + 1) * 10}px`, height: 1, background: th.border, flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontFamily: mono, color: i === 0 ? th.blue : th.muted, fontWeight: i === 0 ? 700 : 400 }}>
              {i === 0 ? "► " : "  "}{l.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function SystemCallFlow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed] = useState(2200);
  const [selectedSyscall, setSelectedSyscall] = useState(SYSCALL_EXAMPLES[0]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStep(s => {
          if (s >= STEPS.length - 1) { setPlaying(false); return s; }
          return s + 1;
        });
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed]);

  function handlePlay() {
    if (step >= STEPS.length - 1) { setStep(0); }
    setPlaying(p => !p);
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateY(-50%) scale(1.4); }
        }
        @keyframes modePulse {
          0% { background: #fef9c3; }
          40% { background: #fde047; }
          100% { background: #fef9c3; }
        }
      `}</style>

      <div style={{ fontFamily: mono, background: th.bg, minHeight: "100vh", color: th.text }}>
        {/* Header */}
        <div style={{ background: th.panel, borderBottom: `1px solid ${th.border}`, padding: "14px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <HomeButton />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: th.text }}>System Call Flow</div>
              <div style={{ fontSize: 12, color: th.muted, marginTop: 1 }}>
                How open/read/write cross from user space into the Linux kernel and back
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 24px 48px" }}>
          {/* Concept banner */}
          <div style={{ background: th.purpleSoft, border: `1px solid ${th.purple}`, borderRadius: 8, padding: "12px 18px", marginBottom: 16, fontSize: 13, color: th.text, lineHeight: 1.75 }}>
            <strong>What is a System Call?</strong> User programs run in <em>restricted</em> CPU mode (Ring 3) and cannot directly access hardware, files, or network. To do so they call the OS kernel via a <strong>system call</strong> — a controlled door from user space into kernel space. The CPU privilege level changes, the kernel does the work, then returns data back to the program.
          </div>

          {/* Syscall selector */}
          <SyscallBanner selected={selectedSyscall} onSelect={sc => { setSelectedSyscall(sc); setStep(0); setPlaying(false); }} />

          {/* Main content: two columns */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Left: layer stack */}
            <div style={{ flex: "0 0 460px", minWidth: 300 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: th.muted, letterSpacing: 1, marginBottom: 10, fontFamily: mono }}>
                SYSTEM LAYERS
              </div>
              <LayerStack step={step} />
            </div>

            {/* Right: step details */}
            <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
              <StepDetail
                step={step}
                total={STEPS.length}
                onPrev={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
                onNext={() => { setPlaying(false); setStep(s => Math.min(STEPS.length - 1, s + 1)); }}
                playing={playing}
                onPlay={handlePlay}
              />
              <CallStack step={step} />
            </div>
          </div>

          {/* Step dots */}
          <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => { setPlaying(false); setStep(i); }} title={s.title.replace(/①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬/, "")} style={{
                width: 28, height: 28, borderRadius: "50%", border: `2px solid ${i === step ? (s.phase === "request" ? th.blue : th.green) : th.border}`,
                background: i === step ? (s.phase === "request" ? th.blue : th.green) : i < step ? (s.phase === "request" ? th.blueSoft : th.greenSoft) : th.panel,
                color: i === step ? "#fff" : th.muted,
                fontFamily: mono, fontSize: 10, fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s",
              }}>
                {i + 1}
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 8, display: "flex", gap: 20, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: th.muted }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: th.blue }} /> Request (1–9)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: th.muted }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: th.green }} /> Response (10–13)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
