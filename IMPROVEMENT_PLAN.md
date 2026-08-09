# Nexus — UI Improvement Plan

This plan takes Nexus from "functional MVP" to a polished, differentiated personal knowledge base. Six phases, each independently shippable. Ship cadence: one phase per PR.

---

## Baseline (current state)

- Entire UI in a single 1,165-line client component (`src/app/(app)/notes/page.tsx`)
- Hand-rolled primitives only (no UI library)
- ~40 inline SVG icons copied throughout the code
- `window.confirm()` for destructive actions, basic toast div for feedback
- `SessionGuard` exists but isn't mounted
- Mermaid installed but not wired up
- Tag schema/API exist but no tag UI
- PWA install flow is invisible
- Five themes, but generic visual language (Geist everywhere)

---

## Phase 1 — Foundation & Hygiene

Highest leverage, lowest risk. Unlocks every other phase.

| Task                      | Detail                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Split monolith            | Break `notes/page.tsx` into `Sidebar`, `NoteList`, `NoteEditor`, `EditorHeader`, `NotebookSection`, `SearchBar`, `CommandPaletteHost`. Move state into `useNotes` and `useNotebooks` hooks. |
| Add icon library          | `lucide-react` — replaces ~40 inline SVGs.                                                                                                                                                  |
| Add `Dialog` primitive    | Custom Tailwind modal. Replace all `window.confirm()` calls (delete note/folder, discard changes, reset app).                                                                               |
| Add `Toast` system        | `sonner` with queue, action buttons, `aria-live`. Replaces the hand-rolled `fixed bottom-4 right-4` div.                                                                                    |
| Add `Skeleton` primitives | Note list, sidebar, editor body. No more empty-flash before content lands.                                                                                                                  |
| Mount `<SessionGuard>`    | In `(app)/layout.tsx`. Dead code right now.                                                                                                                                                 |
| Debounce search           | 250ms client-side debounce before hitting `/api/notes?q=`.                                                                                                                                  |
| Wire Mermaid              | Register a TipTap node + ` ```mermaid ` code-block trigger; render via `mermaid` (already installed).                                                                                       |

**Result:** maintainable codebase, mobile-correct dialogs, real feedback, working diagrams.

---

## Phase 2 — Editor & Writing UX

The product differentiator. Today the editor has no toolbar, no slash commands, no find-in-note.

| Task                      | Detail                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Editor toolbar            | Bubble menu on selection + floating menu on empty line (bold/italic/H1-3/code/link/quote/list/image). |
| Slash command palette     | Type `/` → list of block types.                                                                       |
| Find in note              | Cmd-F override, highlight matches, next/prev.                                                         |
| Word count + reading time | Footer of editor ("342 words · 1 min read").                                                          |
| Note linking `[[Title]]`  | Typeahead autocomplete, clickable links, backlinks panel. The killer PKM feature.                     |
| Frontmatter panel         | YAML / TipTap attrs at top of note (tags, aliases, pinned).                                           |
| Templates                 | User-defined templates with placeholders; "New from template" in context menu.                        |
| Floating `+` menu         | Blank note / From template / New folder.                                                              |

---

## Phase 3 — Information Architecture & Navigation

| Task                    | Detail                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Tag UI                  | Sidebar "Tags" section with counts; chips on cards; tag pages.                      |
| Drag & drop             | Notes into notebooks, reorder notebooks, reorder notes (`order: Int` schema field). |
| Nested notebooks        | Parent/child folders.                                                               |
| Pin & Recents           | Top-of-sidebar sections (data already exists).                                      |
| Cmd+K command palette   | Global search, "Go to note", "Create note", "Switch theme".                         |
| Keyboard navigation     | `j`/`k` through list, `Enter` to open, extend `Esc` close.                          |
| Breadcrumb improvements | Clickable notebook name, full nested path.                                          |

---

## Phase 4 — Visual Polish & Brand

Aesthetic lift. Stop looking like a starter template.

| Task                      | Detail                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Typography                | Serif display face (Fraunces/General Sans) paired with Geist; variable axes; tighter tracking.                     |
| Micro-interactions        | `framer-motion` for sidebar slide, bottom sheet spring, modal fade-scale, note-list hover, toast slide, FAB press. |
| Empty-state illustrations | Inline SVG illustrations for empty lists / no-results / no-tags / no-notebooks.                                    |
| Density toggle            | Compact / Cozy / Comfortable note list. Persisted.                                                                 |
| Hover preview             | 600ms hover → popover with first 200 chars + tags + dates.                                                         |
| Note card metadata        | Tag chips, word count, relative time ("3h ago") in the list.                                                       |
| Refined themes            | Add Solarized, Nord, Sepia; custom theme editor (accent + bg).                                                     |
| Onboarding                | 3-step coachmark tour on first login.                                                                              |

---

## Phase 5 — PWA, Offline, Install

| Task                    | Detail                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Install prompt banner   | Capture `beforeinstallprompt`; non-intrusive; respect dismiss.                                       |
| Update prompt           | Detect SW byte change → "New version available — reload" toast.                                      |
| Offline indicator       | `online`/`offline` listener → slim top bar.                                                          |
| Offline-friendly editor | Queue mutations in IndexedDB while offline; flush on reconnect.                                      |
| PWA polish              | `apple-touch-icon`, `favicon.ico`, `safari-pinned-tab.svg`, splash screens, screenshots in manifest. |

---

## Phase 6 — Export, Import, Integrations

| Task                     | Detail                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| Export menu overhaul     | `.md` / `.html` / `.pdf` (real) / `.docx` / `.json` / `.png` (note-as-image). |
| Import                   | Drag-drop `.md` / `.zip` / `.json` onto sidebar.                              |
| Notebook ZIP progress UI | Progress bar for 200+ note exports.                                           |
| Share link               | Opt-in read-only public URL for a single note. Rate-limited.                  |

---

## Suggested order

`1 → 2 → 3 → 4 → 5 → 6`. Phase 1 is the only blocker; everything else can be reordered based on user feedback after Phase 1 ships.
