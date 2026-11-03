---
name: lattice-dev
description: >-
  Workflows and standards for developing LatticeLedger collaboratively.
  Use when dumping ideas into IDEAS_DUMP.md, synchronizing project state in AGENTS.md,
  or implementing new features for the multi-provider AI note-taking app.
---

# LatticeLedger Development Skill

This skill defines the workflows for pair-programming and extending LatticeLedger.

## Workflow 1: Handling Thought Dumps

When the user says:
- *"dump this idea: ..."*
- *"put this in the thought dump: ..."*
- *"save this idea for later: ..."*

### Steps:
1. Open [IDEAS_DUMP.md](file:///c:/Users/Vijay/Documents/LatticeLedger/IDEAS_DUMP.md).
2. Append a new entry under `## Logged Ideas` with current date/time and the raw user idea.
3. **DO NOT** attempt to implement, architect, or analyze the dumped idea.
4. Confirm to the user that the thought has been logged safely.

---

## Workflow 2: Updating Project Conversation & State

Whenever a discussion concludes with an architectural decision, tech choice, or completed feature:
1. Open [AGENTS.md](file:///c:/Users/Vijay/Documents/LatticeLedger/AGENTS.md).
2. Update the `Current Discussion & Next Steps` checklist and relevant architecture sections.
3. Keep the file synchronized with current code reality.

---

## Workflow 3: Multi-Provider AI Architecture

When implementing or extending AI features (such as note summarization):
- Maintain a strict abstraction: `AIProvider` interface with methods like `generateSummary(noteContent, options)`.
- Support easy addition of:
  - Gemini (`google-genai` / REST)
  - OpenAI / OpenRouter (`openai` SDK / compatible REST)
  - Anthropic Claude
  - Ollama (`http://localhost:11434/api/generate` or `/chat`)
- Ensure user credentials (API keys) and local endpoint configurations are stored securely on the client or in a local `.env.local` file and never hardcoded.

---

## Workflow 4: Implementation Verification

1. After any coding session, run build/typecheck/lint or test commands.
2. Verify that features render cleanly and handle edge cases (empty notes, long notes, API failures, offline state).
