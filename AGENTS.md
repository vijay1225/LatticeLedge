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
  - [x] Graph node interactions: Left-click selects & displays connected notes card; Right-click reveals context menu to "Go to Note".
  - [x] Kept Bi-directional Backlinks always visible and uncollapsed.
  - [x] Implemented Dual-Tab Search modal (`Ctrl + K`): Instant Search (`#tag`, `[[page`) and Ask AI Knowledge Synthesis with citations.
  - [x] Implemented History Navigation (`<` / `>`) tracking visited notes.
  - [x] Implemented Mobile Bottom Navigation bar + Floating Action Button (FAB) for instant capture on phone (`0.0.0.0:3000`).
  - [x] Reserved Right Pane empty per design specification.
  - [x] Seeded rich Harry Potter test knowledge vault.
  - [x] 100% automated test suite passing (10 tests across graphBuilder, wikiLinks, and aiService).
  - [x] Pushed commit to `https://github.com/vijay1225/LatticeLedge.git`.
- [ ] **Next Steps**:
  - [ ] User inspection and feedback on the running app.
  - [ ] Packaging into Tauri v2 desktop & mobile shell.
