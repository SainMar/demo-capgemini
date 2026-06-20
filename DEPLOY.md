# Live demo flow

## Prerequisites

- Repo connected to Vercel (Add New > Project > Import `SainMar/demo-capgemini`)
  - Framework preset: **Vite** (auto-detected)
  - Output directory: `dist`
  - No env vars required
- Hodor MCP running locally (`HODOR_API_KEY` set in `.env.local`)

---

## Step 1 — Trigger auto-deploy

```bash
git push origin main
```

Vercel picks up the push automatically. Watch the build go **Ready** at:
`https://vercel.com/sainmar/demo-capgemini`

Production URL (set after first deploy):
`https://demo-capgemini.vercel.app`   ← update once Vercel assigns the real URL

---

## Step 2 — Send recap email via Hodor MCP (Gmail)

Approve the send live during filming. The template is at:
`discovery/recap-email-template.md`

Tool to call: `Gmail_Personal / gmail_send_email`

---

## CLI fallback (if auto-deploy fails on the day)

```bash
npx vercel --prod
```

Builds and promotes to production in one command. No Vercel account login needed
if already authenticated locally (`vercel whoami`).
