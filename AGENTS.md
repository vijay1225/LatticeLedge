# LatticeLedger - Collaborative Agent Guidelines & Project State

Welcome to **LatticeLedger**. This repository is developed collaboratively through pair-programming between the user and AI assistant.

---

## 1. Operating Rules & Collaborative Workflow

1. **True Pair Programming Partnership**:
   - We discuss architecture, tech stack, and feature requirements together before diving into large code changes.
   - When new decisions are made or features are completed, keep `AGENTS.md` and related skills/docs updated to reflect current state.

2. **Strict Isolation of `IDEAS_DUMP.md`**:
   - **DO NOT** read, ingest, or assume requirements from [IDEAS_DUMP.md](file:///c:/Users/Vijay/Documents/LatticeLedger/IDEAS_DUMP.md).
   - That file is strictly an unfiltered thought dump for the user's speculative ideas.
   - When the user says *"dump this idea..."*, simply append the thought with a timestamp to `IDEAS_DUMP.md` and confirm without triggering implementation work.

3. **Incremental & High-Quality Implementation**:
   - Code should be clean, modular, and maintainable.
   - Add automated verification/tests and ensure all changes are functional.

---

## 2. Project Vision: AI-Augmented Note-Taking Application

### Core Concept & Data Model
LatticeLedger is a modern, AI-augmented Personal Knowledge Management (PKM) system combining Zettelkasten/wiki-linking with model-agnostic AI:
- **Dual Note System**:
  - **Quick Notes (Fleeting / Scratchpad)**: Zero-friction instant capture. AI automatically extracts keywords, entities, and tags.
  - **Wiki Pages (Permanent / Evergreen)**: Titled documents linked via bi-directional `[[wiki-links]]` (Obsidian/Logseq style).
- **AI-Driven Knowledge Association**:
  - AI extracts key concepts and tags from all notes.
  - When viewing/editing a Wiki Page, AI intelligently suggests relevant Quick Notes as references/citations to connect into the page.
- **Interactive Knowledge Graph**:
  - Graph view visualizes the entire knowledge base:
    - Nodes: Wiki Pages (primary), Quick Notes (secondary), Tags/Concepts.
    - Edges: Explicit `[[wiki-links]]` (solid lines) + AI semantic/tag associations (dashed lines).
- **Per-Note AI Summary Card**: Placed above each note's body, displaying a concise summary, key takeaways, action items, and relevant tags generated on demand.
- **Universal / Model-Agnostic AI Integration (BYOK)**:
  - **Primary Model for Initial Phase**: **Google Gemini API** (using `@google/genai` with `gemini-2.5-flash` for high-speed, cost-effective structured summaries and tag extraction).
  - **Extensible Architecture**: Clean adapter interface ready for subsequent additions: OpenAI (GPT), Anthropic Claude, Groq, OpenRouter, and Ollama (local offline).
  - **Strict Provider Normalization (Identical Work / Zero Disruption)**:
    - Standardized `AIProvider` adapter interface returning uniform typed structures (Zod/JSON schema validated):
      - Summary (`tldr: string[]`, `actionItems: string[]`)
      - Tag & entity extraction (`tags: string[]`, `keywords: string[]`)
      - Contextual recommendation logic.
- **Search & Note Querying System (Dual-Tab Experience)**:
  - Accessible via global shortcut (`Ctrl + K` / `Cmd + K`) on desktop and a dedicated primary search tab on mobile.
  - **Tab 1: Instant Search**:
    - High-speed local Full-Text Search (FTS) across note content, titles, and tags.
    - Prefix triggers (`#tag`, `[[page`, `@date`) for instant filtering.
  - **Tab 2: Ask AI (Knowledge Synthesis)**:
    - Natural language question answering across your entire knowledge base.
    - Synthesized responses with clickable citations linking directly to the source notes.
- **Responsive Layout & Mobile Ergonomics**:
  - **Desktop (3-Pane)**: Left Navigation & History (`<` / `>`), Center Workspace, Right Pane (empty/reserved).
  - **Mobile (Touch-First & Thumb-Friendly)**:
    - Top Bar: Note history navigation (`<` / `>`), Cloud Sync indicator (🟢), Settings.
    - Bottom Navigation Bar: **Notes**, **Quick Notes Feed**, **Search (Dual Tab)**, **Knowledge Graph**.
    - Floating Action Button (FAB): 1-tap bottom sheet for instant Quick Note capture on the go.
    - Touch-optimized 2D Knowledge Graph with pinch-to-zoom and node tap preview cards.
  - **Left Pane (Mode Switcher & Navigation)**:
    - History Navigation: `<` (Previous) and `>` (Next) note history navigation (inspired by Obsidian/Logseq).
    - Section Menu: **Notes View**, **Graph View**, **Quick Notes Inbox**, and extensible slots for future features.
  - **Center Pane**: Notes List / Active Note Editor / Graph Canvas depending on the selected mode.
  - **Right Pane**: Kept empty / reserved for future feature definition per user instruction.
- **Storage & Sync Architecture**:
  - **Local-First (Offline)**: All notes created, edited, and stored locally with zero latency.
  - **Cloud Sync**: Firebase Firestore for real-time multi-device sync with offline persistence.
  - **Authentication**: **Google Sign-In** (Firebase Auth) on both Desktop and Mobile for seamless private vault synchronization.
- **Cross-Platform Target**: Tauri v2 + React / TypeScript + Tailwind CSS (Desktop: Windows, macOS, Linux; Mobile: Android, iOS).

---

## 3. Current Discussion & Next Steps

> **CRITICAL DIRECTIVE**: **DO NOT** implement or scaffold any application code until the user explicitly says: *"now implement the project"*. We are strictly in the architecture, UI requirements, and UX design phase.

- [x] Initial workspace structure, thought dump setup, and agent rules created.
- [x] Agreed on Tech Stack: **Tauri v2 + React / TypeScript + Tailwind CSS**.
- [x] **Core PKM & AI Architecture Defined**:
  - [x] Dual-tier notes (Quick Notes with AI tag extraction vs. Wiki Pages with `[[links]]`).
  - [x] AI contextual reference suggestions (connecting Quick Notes to Pages).
  - [x] Interactive Knowledge Graph mode.
  - [x] History navigation (`<` / `>`) across notes.
  - [x] 3-Pane Desktop structure (Left: Section Menu & History; Center: Active Workspace; Right: Reserved/Empty).
  - [x] Universal AI Provider Abstraction (GPT, Claude, Gemini) with identical normalized output schemas.
  - [x] Search & Querying Architecture (Dual Tab: Instant Search vs. Ask AI, Desktop Omnibar + Mobile Bottom Tab).
  - [x] Authentication & Sync: Google Sign-In via Firebase Auth for Desktop and Mobile.
  - [x] Initial AI Provider: Google Gemini API (structured schema, with pluggable adapter for future models).
- [x] **Implementation Phase 1 Completed & Verified**:
  - [x] Scaffolded React 18 + TypeScript + Vite + Tailwind CSS foundation.
  - [x] Implemented Dual-Tier Note system: Wiki Pages with `[[wiki-links]]` and Quick Notes with auto-tagging.
  - [x] Implemented Per-Note AI Summary Card: always-expanded, strictly capped $\le 4$ lines.
  - [x] Implemented AI Contextual Reference suggestions surfacing relevant Quick Notes inside Wiki Pages.
  - [x] Implemented 2D D3 Force-Directed Knowledge Galaxy with Planetary Hubs, orbiting Quick Note Satellites, and 1-click toggles to Hide/Show Quick Notes and Hide/Show Tags for decluttering large vaults.
  - [x] Implemented In-Place WYSIWYG Live Markdown Editor (TipTap Option A): type directly on formatted headings, checklists, quotes, and links without preview/edit mode toggles.
  - [x] Maximized Writing Space: Default-collapsed reserved right pane (+256px), collapsible left sidebar (`Ctrl+\`), full-width canvas toggle (`max-w-none`), and 1-click Focus/Zen Mode (Esc to exit) for full-bleed writing.
  - [x] Graph node interactions: Left-click selects & displays connected notes card; Right-click reveals context menu to "Go to Note".
  - [x] Kept Bi-directional Backlinks always visible and uncollapsed.
  - [x] Implemented Dual-Tab Search modal (`Ctrl + K`): Instant Search (`#tag`, `[[page`) and Ask AI Knowledge Synthesis with citations.
  - [x] Implemented History Navigation (`<` / `>`) tracking visited notes.
  - [x] Implemented Mobile Bottom Navigation bar + Floating Action Button (FAB) for instant capture on phone (`0.0.0.0:3000`).
  - [x] Reserved Right Pane empty per design specification.
  - [x] Seeded rich Harry Potter test knowledge vault.
  - [x] Built native 100% Standalone Android APK (`LatticeLedger.apk`, 4.96MB) via Capacitor v8 & Gradle 8.14 (Java 17).
  - [x] Integrated High-Speed SQLite Database Engine (`sqliteService.ts`): Replaced slow loose-file storage with indexed SQLite tables (`lattice_vault.db`), providing sub-millisecond query speed, ACID transactions, and zero disk fragmentation.
  - [x] Google Drive Single-File Vault Architecture: Mobile APK and future Desktop app share the exact same `lattice_vault.db` SQLite database file via a Google Drive folder.
  - [x] Implemented 1-click SQLite Database Export and Import directly in Settings.
  - [x] BYOK Direct AI Connection: Google Gemini API connects directly from the phone using the user's Gemini API key (no intermediate proxy server).
  - [x] Pure Gemini Direct Integration (Zero Mock/Simulated AI):
    - Completely deleted simulated heuristic fallback (`generateSimulatedSummary`, `generateSimulatedAnswer`).
    - Stripped all hardcoded seed summaries from `harryPotterSeed.ts` so zero pre-baked AI summaries exist.
    - AI summarization and Ask AI strictly require a valid Gemini API key; missing keys cleanly block with explicit guidance to Settings.
  - [x] Mobile & Desktop "Add Page" and Knowledge Connections Overhaul:
    - Added prominent "+ Page" action and "Pages (X)" drawer toggle on mobile header.
    - Added "+ New Page" button in NoteEditor toolbar.
    - Upgraded mobile FAB bottom sheet to dual tabs: "+ New Wiki Page" and "Quick Note".
    - Fixed note text overwriting race condition by binding `key={activeNote.id}` to `<NoteEditor>`.
    - Added bottom padding `pb-28 md:pb-12` preventing long pages from clipping behind mobile bottom bar.
    - Implemented Comprehensive Linked Pages Hub: Outgoing links bar under title + Outgoing Linked Pages cards & Bi-directional Backlinks cards at the bottom.
    - Built rich `MarkdownViewer` component for Ask AI: renders headings, lists, bold text, and clickable `[[Wiki Links]]`.
  - [x] Page Save & Overflow Fixes + Streamlined Gemini API Key Flow:
    - Added explicit **"Save" button** with `Save` and `Check` visual feedback in `NoteEditor.tsx`.
    - Added **Ctrl+S / Cmd+S** keyboard shortcut to quickly save notes to SQLite.
    - Fixed flexbox height collapse in `.tiptap.ProseMirror` and editor canvas wrapper; content flows naturally with zero overlapping on bottom bidirectional links and action items.
    - Promoted **Google Gemini API Key** to the very top section of SettingsModal.
    - Added **Eye / EyeOff password visibility toggle** and 1-tap clipboard paste.
    - Implemented **instant auto-save on paste/change** so API keys are never lost when navigating away.
    - Upgraded **"Test & Verify Key"** to report exact Google API error messages (e.g. `API_KEY_INVALID`, quota limits, or network errors) and auto-save on success.
    - Added **automatic Flash model fallback** (`gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash`) and key sanitization in `aiService.ts`.
  - [x] Dynamic Gemini Model Discovery & Selection (Resolved Model Availability Issues):
    - Removed hardcoded model list in favor of dynamic Google API model fetching via `fetchAvailableGeminiModels`.
    - Added dedicated **"Fetch Available Models"** button in Settings with 1-tap refresh.
    - Testing an API key automatically queries Google Gemini API and populates the model dropdown with all active, permitted models for that key.
    - Dropdown groups models into **Recommended for Note Synthesis** (e.g. `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-3.5-flash`) and **Other Available Models**.
    - Added **Custom Model ID** text input toggle allowing manual model override.
    - Updated `callGeminiWithFallback` in `aiService.ts` to automatically handle JSON-mode failure fallbacks and cycle across account-available models.
    - Auto-migrated deprecated `gemini-2.5-flash` in `localStorage` to `gemini-3.8-flash`.
  - [x] Complete Root-Cause Elimination of Page Overflow & Text Stacking:
    - Replaced vertical flex column (`flex flex-col`) on note scroll container with natural document block layout (`block`).
    - Added `min-h-0 min-w-0` to flex parents in `App.tsx` ensuring browser flex layout calculations never constrict child scroll containers.
    - Added `h-auto block clear-both` on canvas wrapper and `EditorContent` with `overflow-wrap: break-word` and `word-break: break-word` preventing text spillover.
    - Added clear boundary margin and top padding (`mt-12 pt-8 border-t-2`) on Knowledge Connections Hub so cards strictly render below full-height note content.
    - Extended bottom padding to `pb-36 md:pb-16` preventing any overlap with mobile bottom navigation bar.
  - [x] **Desktop Application & Unified Google Drive Folder Synchronization Engine**:
    - **Native Windows Desktop Application**: Packaged via Electron and `electron-builder` with dark titlebar, modern layout, and high-performance native IPC (`electron/main.cjs` & `electron/preload.cjs`).
    - Generated standalone executable `LatticeLedger-Desktop.exe` (124.5MB) and unpacked executable in `release/win-unpacked/LatticeLedger.exe`.
    - **Unified Cross-Platform Vault Synchronization (`vaultSyncService.ts`)**:
      - Supports binding to any Google Drive folder (e.g. `G:\My Drive\LatticeLedger` on Desktop or `Documents/LatticeLedger` on Mobile).
      - **Bi-directional Real-Time Sync**: Automatically saves `lattice_vault.db` to the bound folder upon any note create/edit/delete; watches and detects external cloud updates (e.g., changes made on the other device) and hot-reloads SQLite with zero data loss.
      - **Desktop (Electron)**: Native OS directory picker dialog, atomic file read/write, and filesystem watcher (`fs.watch`).
      - **Desktop/Browser (Web)**: HTML5 File System Access API (`showDirectoryPicker`) with persistent directory handle in IndexedDB.
      - **Mobile (Android APK)**: Capacitor Filesystem (`@capacitor/filesystem`) storing `lattice_vault.db` in `Documents/LatticeLedger`, paired with direct file picker import/export.
    - **Settings UI Overhaul**:
      - Prominent **"Choose Vault Folder (Google Drive / Local)"** button.
      - Real-time bound folder status card showing path, platform badge, sync state (🟢 In Sync), last sync timestamp, "Sync Now", and "Disconnect".
      - Maintained manual export/import SQLite `.db` buttons for quick ad-hoc transfers.
  - [x] 100% automated test suite passing (26 tests across vaultSyncService, sqliteService, graphBuilder, wikiLinks, aiService, and markdownViewer).
  - [x] Rebuilt native standalone Android APK (`LatticeLedger.apk`, 7.84MB) with Capacitor Filesystem and Gradle 8.14 on Java 17.
  - [x] Built Windows Desktop Application (`LatticeLedger-Desktop.exe`, 124.5MB).
- [ ] **Next Steps**:
  - [ ] User runs `LatticeLedger-Desktop.exe` on Windows and installs `LatticeLedger.apk` on Android phone.
  - [ ] Select identical Google Drive folder on both devices to enable automatic cross-platform sync.
