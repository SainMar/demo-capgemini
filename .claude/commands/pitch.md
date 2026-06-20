---
description: Generate a Shape Up pitch from a problem description or discovery file
autoExecute: false
---

Generate a full Shape Up pitch from `$ARGUMENTS`.

`$ARGUMENTS` can be: a problem description (inline) or a path to a discovery file.

Steps:
1. Read the input in full.
2. Generate the pitch with these sections:
   - **Problem** — the real pain, from the user's perspective
   - **Appetite** — how much time we're willing to spend (fixed)
   - **Solution** — the cupcake: what we build, no more
   - **Rabbit Holes** — risks and traps to watch out for
   - **No-gos** — explicitly out of scope for this cycle
3. Determine the next PITCH number by checking `discovery/pitches/` (create folder if absent).
4. Write the pitch to `discovery/pitches/PITCH-XX-short-name.md`.
5. Display a summary: problem in one sentence, appetite, and the 3 must-have solution elements.

Note: no automatic Linear ticket — create one manually if needed after reviewing the pitch.

Usage examples:
- `/pitch "The team has no single place to track tasks"`
- `/pitch discovery/01_client_request.md`
