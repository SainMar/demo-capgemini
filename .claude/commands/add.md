---
description: Extract insights from a source file and merge them into the discovery base
autoExecute: false
---

Extract pains, insights, and verbatims from `$ARGUMENTS` and merge into `discovery/`.

`$ARGUMENTS`: path to a source file (markdown notes, interview transcript, email, etc.)

Note: if the source is audio or video, transcribe it manually before using this command.

Steps:
1. Ask if there is additional context to consider (optional).
2. Read the source file in full.
3. Extract:
   - Pains (concrete problems experienced by users)
   - Insights (observations, patterns, behavioral signals)
   - Verbatims (exact quotes worth keeping)
   - Data points (numbers, metrics, facts)
4. For each extracted item, check existing discovery files:
   - >70% overlap with an existing finding → enrich that file
   - Otherwise → propose creating a new entry
5. Present the full modification plan (what gets added where) and WAIT for explicit approval.
6. Execute only after approval.
7. Output a summary: N items extracted, M files updated, K new entries created.

Usage examples:
- `/add discovery/04_user_interviews.md`
- `/add notes/sales-call-2026-06-20.md`
