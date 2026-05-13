# OS Concepts Lab

Interactive visualizers for classic operating system algorithms — built for undergrad students at CMRIT AIML.

## Modules

| Module | Description |
|--------|-------------|
| **Page Replacement** | Step through FIFO, LRU, Optimal (Bélády), LFU, MRU, and Clock algorithms with per-step hit/fault tracking |
| **Memory Fragmentation** | Animate internal and external fragmentation with live memory layout visualizations |
| **Address Translation** | Map logical addresses to physical memory via page tables and segmentation |
| **System Call Flow** | Animate how `open`/`read`/`write` cross from user space into the Linux kernel and back |

## Tech Stack

- **React 19** — UI components
- **Vite 8** — dev server and multi-page build
- **Vanilla CSS-in-JS** — no external UI library

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
```

Output goes to `dist/`. Each visualizer is a separate HTML entry point configured in [vite.config.js](vite.config.js).

## Project Structure

```
src/
  App.jsx                    # Page Replacement visualizer
  MemoryFragmentation.jsx    # Memory Fragmentation visualizer
  PageTableTranslation.jsx   # Address Translation visualizer
  SystemCallFlow.jsx         # System Call Flow visualizer
  HomePage.jsx               # Landing page with links to all modules
  *-main.jsx                 # Entry points for each HTML page
index.html                   # Home page
page-replacement.html
memory.html
paging.html
syscall.html
```
