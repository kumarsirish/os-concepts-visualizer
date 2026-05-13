export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f6f8fb; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        a { text-decoration: none; }
        .card { transition: transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(9,105,218,0.12); }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f6f8fb" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #d0d7de", padding: "18px 40px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>🖥️</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#1a1a1a" }}>OS Concepts Lab</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 1 }}>Interactive simulators for operating system concepts</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "56px 32px 40px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 800, color: "#1a1a1a", marginBottom: 10 }}>
            Learn OS by Doing
          </div>
          <div style={{ color: "#555", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            Step through classic operating system algorithms with interactive visualizations — built for undergrad students.
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "stretch", padding: "0 32px 60px" }}>

          {[
            { href: "/page-replacement.html", icon: "🔄", iconBg: "#dbeafe", title: "Page Replacement",    desc: "Visualise FIFO, LRU, Optimal and more — step by step with hit/fault tracking.",                        linkColor: "#0969da" },
            { href: "/memory.html",           icon: "🧠", iconBg: "#e7f6ec", title: "Memory Fragmentation", desc: "Explore internal and external memory fragmentation with live animations.",                           linkColor: "#1a7f37" },
            { href: "/paging.html",           icon: "📋", iconBg: "#f0ebff", title: "Address Translation",  desc: "See how logical addresses map to physical memory via page tables and segmentation.",                  linkColor: "#6e40c9" },
            { href: "/syscall.html",          icon: "⚡", iconBg: "#fff8e1", title: "System Call Flow",      desc: "Animate how open/read/write cross from user space into the Linux kernel and back.", linkColor: "#9a6700" },
          ].map(({ href, icon, iconBg, title, desc, linkColor }) => (
            <a key={href} href={href} style={{ display: "flex", width: 240 }}>
              <div className="card" style={{
                display: "flex", flexDirection: "column",
                background: "#fff", borderRadius: 14, padding: "32px 28px",
                border: "1px solid #d0d7de", width: "100%",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16, flexShrink: 0 }}>{icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.65, flex: 1 }}>{desc}</div>
                <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: linkColor }}>Explore →</div>
              </div>
            </a>
          ))}

        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", borderTop: "1px solid #d0d7de", padding: "16px 40px", textAlign: "center", fontSize: 12, color: "#888", background: "#fff" }}>
          OS Concepts Lab — built for CMRIT AIML undergrad students
        </div>
      </div>
    </>
  );
}
