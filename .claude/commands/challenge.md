---
description: Challenge a hypothesis, idea, or decision using 4 parallel agents
autoExecute: false
---

Orchestrate 4 sub-agents in parallel to challenge `$ARGUMENTS`.

`$ARGUMENTS` can be: a hypothesis, an idea, a decision, or a file reference (e.g. a discovery file path).

Steps:
1. If `$ARGUMENTS` references a file in `discovery/`, read it in full first.
2. Delegate to all 4 agents simultaneously:
   - **Skeptic** — finds reasons it will fail
   - **User Advocate** — challenges whether users actually want this
   - **Competitor** — maps the competitive landscape
   - **Optimist** — identifies the best-case scenario and conditions for success
3. Consolidate the 4 outputs into a Challenge Report:
   - One section per agent (their full output)
   - A final "Key question to resolve" — the single most important uncertainty to address before moving forward
4. No automatic verdict. The human decides.

Usage examples:
- `/challenge "Add a notifications feature"`
- `/challenge discovery/02_manager_brief.md`
- `/challenge "Ship in 3 weeks instead of 6"`
