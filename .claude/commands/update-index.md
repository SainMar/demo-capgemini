---
description: Scan discovery/ and update the index file
autoExecute: false
---

Scan `discovery/` and update (or create) `discovery/00-INDEX.md`.

Steps:
1. List all files in `discovery/` (excluding `00-INDEX.md` itself and `pitches/`).
2. List all pitches in `discovery/pitches/`.
3. Rebuild `discovery/00-INDEX.md` with:
   - A **Discovery files** table: filename, one-line summary, last modified date
   - A **Pitches** table: PITCH number, name, appetite, status (draft / ready)
   - Counters: total discovery files, total pitches
4. Write the updated index.
5. Report: N files indexed, M pitches listed.

Usage: `/update-index`
