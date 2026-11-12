# LatticeLedger

<p align="center">
  <strong>A modern, AI-augmented Personal Knowledge Management (PKM) system & Second Brain.</strong><br>
  Local-First SQLite &bull; Bi-directional Wiki Links &bull; Continuous Canvas Journals &bull; D3 Knowledge Galaxy &bull; Google Drive Sync &bull; Google Gemini AI (BYOK)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Web-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/Local--First-SQLite%20WASM-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%20(BYOK)-4285F4?style=flat-square&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Editor-TipTap%20WYSIWYG-0D9488?style=flat-square" alt="TipTap" />
  <img src="https://img.shields.io/badge/Graph-D3.js%20Galaxy-F9A03F?style=flat-square&logo=d3.js" alt="D3" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## 🌟 Overview

**LatticeLedger** combines the speed of instant scratchpads, the depth of networked evergreen wiki documents, the daily flow of Logseq-style journaling, and the intelligence of modern Large Language Models into a private, local-first application.

Designed for researchers, thinkers, developers, and writers who want a distraction-free writing environment with **zero vendor lock-in**, your entire vault is stored in a single, high-performance SQLite database file (`lattice_vault.db`) that synchronizes seamlessly across Windows and Android devices via Google Drive.

```mermaid
graph TD
  subgraph Capture & Ideation
    QN[⚡ Quick Notes / Scratchpad]
    JN[📅 Continuous Daily Journals]
  end

  subgraph Evergreen Knowledge
    WP[📚 Permanent Wiki Pages]
  end

  subgraph AI Engine [Google Gemini BYOK]
    SUM[📝 Per-Note Summaries & Action Items]
    REC[💡 Contextual Quick Note Recommendations]
    ASK[🔍 Ask AI Knowledge Synthesis]
  end

  subgraph Visualization & Retrieval
    KG[🌌 2D D3 Knowledge Galaxy]
    SRCH[⚡ Dual-Tab Search & Full-Text Search]
  end

  QN -->|Reference / Convert| WP
  JN -->|[[Wiki Links]]| WP
  WP <-->|[[Bi-directional Backlinks]]| WP
  WP --> SUM
  QN --> REC --> WP
  WP & QN & JN --> KG
  WP & QN & JN --> ASK
  WP & QN & JN --> SRCH
```

---

## ✨ Key Features

### 1. 📚 Triple-Mode Knowledge System
- **Evergreen Wiki Pages**: Structured, permanent knowledge documents connected via bi-directional `[[Wiki Links]]` (Obsidian / Roam style). Backlinks and forward links update dynamically.
- **Continuous Daily Journals (Logseq Style)**: An infinite, continuous stream of daily logs separated by clean line dividers. Features automatic "Today" jump, date picker, interactive checkboxes (`- [ ]`), and inline `[[Wiki Links]]`.
- **Fleeting Quick Notes**: Zero-friction scratchpad for instant thoughts, meeting snippets, or raw ideas. Editable in-place and convertible into full Wiki Pages with a single click.

### 2. 🌌 Interactive 2D D3 Force-Directed Knowledge Galaxy
- **Planetary Physics Simulation**: Visualizes your entire vault in real time with D3.js.
  - **Planetary Hubs**: Evergreen Wiki Pages.
  - **Orbiting Satellites**: Fleeting Quick Notes.
  - **Journal Nodes**: Daily logs connected to referenced pages.
  - **Edges**: Solid lines for explicit `[[links]]`, dashed lines for AI semantic and tag connections.
- **Mobile Touch & Pinch-to-Zoom**: Built-in 1-finger panning, physics node dragging, and smooth 2-finger pinch-to-zoom.
- **Declutter Filters**: 1-click toggles to show/hide Quick Notes, show/hide Tags, or show/hide Daily Journals.
- **Zero-Latency Loading**: Background idle prefetching and pre-warmed graph data ensure the galaxy renders instantly with 0ms delay.

### 3. ✍️ In-Place WYSIWYG Live Markdown Editor (TipTap Engine)
- **Live Markdown Canvas**: Type formatted headings (`#`, `##`), interactive task lists (`- [ ]`), bullet lists, blockquotes, code blocks, and horizontal rules directly on screen without needing separate "Edit" and "Preview" modes.
- **Interactive `[[` Autocomplete Popup**: Type `[[` anywhere to trigger a floating suggestion menu. Filter existing pages with fuzzy search, navigate with arrow keys, or hit Enter to auto-create new pages.
- **Rich Code Blocks**: Multi-language code editor with language selector (Python, TypeScript, SQL, Rust, Go, Bash, Markdown) and 1-click "Copy Code" button.
- **GitHub & Obsidian Callouts**: Native alert cards (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!CAUTION]`).
- **Media Hub & YouTube Shorts**: Drag-and-drop local image uploads with lightbox zoom, standard video embeds, and dedicated 9:16 vertical players for YouTube Shorts.
- **Robust Auto-Save**: Real-time debounced auto-save (600ms) with visual status indicators (`● Saved to SQLite`), plus safety flushes on page switch, blur, or window close.

### 4. 🧠 Universal AI Integration (Google Gemini BYOK)
- **100% Private (Bring Your Own Key)**: Directly calls Google Gemini API from your device. No third-party proxy, no intermediate server, no telemetry.
- **Per-Note Summary Cards**: On-demand structured executive summaries, key takeaways, and action items generated in seconds.
- **Contextual Quick Note Suggestions**: Intelligently analyzes your active Wiki Page and surfaces relevant scratchpad notes to cite and integrate.
- **Dual-Tab Search & Knowledge Synthesis (`Ctrl + K`)**:
  - **Tab 1: Instant Search**: Sub-millisecond full-text search across titles, content, and `#tags`.
  - **Tab 2: Ask AI (Knowledge Synthesis)**: Ask natural-language questions across your entire vault. Gemini synthesizes an answer with clickable `[[Citations]]` linking back to the source notes.
- **Dynamic Model Selection**: Auto-discovers permitted models on your key (`gemini-2.5-flash`, `gemini-3.8-flash`, `gemini-flash-latest`), with support for custom model overrides.

### 5. 💾 Local-First SQLite & Google Drive Multi-Device Sync
- **Single-File Vault (`lattice_vault.db`)**: Ultra-fast, ACID-compliant SQLite WASM engine running locally in-memory with debounced disk persistence.
- **Unified Sync Engine**:
  - **Desktop (Windows)**: Bind directly to your local Google Drive folder (`G:\My Drive\LatticeLedger`). Atomic file updates and native filesystem watchers detect changes from other devices in real time.
  - **Mobile (Android)**: Native document picker and 1-tap "Save / Share to Drive" integration.
- **Offline Resilient**: Real-time network detection. Clear `⚠️ File not synced (Offline)` badges inform you when offline, while local SQLite guarantees 100% data safety.
- **Ad-Hoc Import & Export**: 1-click binary `.db` export/import and human-readable `.json` backup restore.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | UI component hierarchy and typed state management |
| **Build & Bundler** | Vite + Rollup | Fast HMR and optimized vendor chunk splitting |
| **Styling** | Tailwind CSS + Lucide Icons | Responsive modern dark theme and icons |
| **Rich Text Editor** | TipTap v3 (ProseMirror) | WYSIWYG live markdown engine and task list extensions |
| **Graph Visualization** | D3.js (`d3-force`) | 2D force-directed physics galaxy simulation |
| **Local Database** | SQL.js (SQLite WASM) | In-memory ACID relational storage (`lattice_vault.db`) |
| **AI Integration** | `@google/genai` | Google Gemini API integration (BYOK) |
| **Desktop Runtime** | Electron 45 + electron-builder | Windows desktop app with native IPC and NSIS installer |
| **Mobile Runtime** | Capacitor v8 + Android SDK 34 | Native Android APK with filesystem and share APIs |
| **Test Suite** | Vitest + Testing Library | 88 automated unit tests covering all core services |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- (Optional for Android builds) Java 17 + Android Studio SDK

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/vijay1225/LatticeLedger.git
cd LatticeLedger

# Install dependencies
npm install

# Run the web development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📦 Building Standalone Binaries

### 1. Windows Desktop Application
To compile the standalone Windows applications:

```bash
# Build Vite frontend and Electron packaging
npm run desktop:build
```

This generates:
- **NSIS Setup Installer**: `release/LatticeLedger Setup 0.2.0.exe` (or `LatticeLedger-Setup.exe` in root)
  - Installs to `Program Files`, adds Start Menu & Desktop shortcuts, and supports in-place auto-updating.
- **Standalone Portable EXE**: `release/LatticeLedger 0.2.0.exe` (or `LatticeLedger-Desktop.exe` in root)
  - Zero-install, single-file executable that runs immediately with a double-click.

### 2. Android Mobile Application
To sync and compile the native Android APK:

```bash
# Build production web bundle
npm run build

# Sync web assets to Capacitor Android project
npx cap sync android

# Build release APK via Gradle
cd android
./gradlew assembleDebug
```

The APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk` (or `LatticeLedger.apk` in root).

---

## ⚙️ Google Gemini API Key Setup

LatticeLedger uses a **BYOK (Bring Your Own Key)** architecture:

1. Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Open LatticeLedger and click **Settings** (gear icon in the sidebar or top bar).
3. Paste your API key into the **Google Gemini API Key** field.
4. Click **"Test & Verify Key"**. LatticeLedger will automatically query Google's API, verify your quota, and populate the dropdown with active, compatible models.
5. All AI features (Summaries, Ask AI, Quick Note recommendations) are immediately unlocked.

---

## 🔄 Cross-Device Sync Setup (Google Drive)

To keep your notes in sync between your Windows PC and your Android phone:

```
[Windows PC]  <-- Google Drive (lattice_vault.db) -->  [Android Phone]
```

1. **On Windows PC**:
   - Install the Google Drive desktop app (which creates a `G:\My Drive` drive).
   - In LatticeLedger Desktop, go to **Settings** > **Vault Synchronization**.
   - Click **"Choose Vault Folder"** and select a folder in Google Drive (e.g. `G:\My Drive\LatticeLedger`).
   - LatticeLedger will automatically create and save `lattice_vault.db` there.
2. **On Android Phone**:
   - Open the LatticeLedger APK.
   - Go to **Settings** > **Google Drive & Vault Folder**.
   - Use **"Import from Google Drive"** to select `lattice_vault.db` directly from your Google Drive.
   - Any time you finish writing on your phone, use **"Save / Share to Google Drive"** to push updates back.

---

## 🧪 Automated Testing

LatticeLedger includes a comprehensive automated test suite with 100% pass rate:

```bash
# Run Vitest unit tests
npm test
```

Test coverage includes:
- `vaultSyncService.test.ts`: Cross-platform SQLite export, import, and sync mechanisms.
- `sqliteService.test.ts`: In-memory SQLite queries, demo page auto-merging, and debounced export.
- `journalsView.test.tsx`: WYSIWYG markdown daily journals and TODO checklist toggles.
- `wikiLinks.test.ts`: Bidirectional link parser and backlink graph resolution.
- `wikiLinkAutocomplete.test.tsx`: Caret hit-testing and floating popup navigation.
- `graphBuilder.test.ts`: D3 physics node and edge topology generation.
- `aiService.test.ts`: Google Gemini payload normalization and error handling.
- `markdownViewer.test.tsx`: Static markdown parity, callouts, and YouTube embed parsing.
- `assetService.test.ts`: YouTube Shorts detection and local asset caching.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
