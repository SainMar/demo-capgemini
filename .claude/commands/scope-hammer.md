---
description: Apply Shape Up's fixed-time variable-scope to cut a feature down to its cupcake
autoExecute: false
---

Apply Shape Up's "fixed time, variable scope" principle to `$ARGUMENTS`.

`$ARGUMENTS` can be: a feature description, a pitch file path, or a discovery file path.

Steps:
1. Read the input in full (file or inline description).
2. List every element of the proposed solution.
3. For each element, ask three questions:
   - What happens if we don't build this?
   - What is the simplest possible version?
   - Is this needed for the first real user?
4. Classify each element: **Must** / **Should** / **Could**
5. Rewrite the solution keeping Must-only items.
6. Target: scope reduced to at most half the original appetite.
7. List explicitly what is deferred to v2 and why.

Output: a trimmed solution + a "Deferred to v2" list.

Usage examples:
- `/scope-hammer "Task board with filters, labels, priorities, and assignees"`
- `/scope-hammer discovery/02_manager_brief.md`
