# VAERS Modernization Prototype

A high-fidelity prototype of the reporting experience described in
`VAERS_Modernization_Technical_Design_Document.md`: a branching-logic report
form (public vs. healthcare provider), document upload with a rule-based
suggestion tool, two CSAT survey instruments, and a contextual FAQ — built
against a normal self-hosted stack rather than CDC's real Azure/legacy
backend. There is no real VAERS/CDC integration here; this stands in front of
nothing but its own database.

**Scope note:** the low-code CMS/admin console and SAMS/OAuth are out of
scope for this build (see the plan this was built from). Everything else in
the design doc's base-period scope — branching logic, uploads, document
suggestions, surveys, FAQ, landing page/nav — is implemented.

## Stack

- **Shared** (`shared/`) — branching-logic rules, zod validation schemas,
  the document-suggestion heuristic, and the FAQ dataset. Plain TypeScript,
  no build step; imported by relative path from both the server and client
  so client and server validation can never drift apart.
- **Server** (`server/`) — Express + TypeScript API, Prisma ORM. Runs via
  `tsx` directly (no compile step) in both dev and "production" for this
  prototype's scale.
- **Client** (`client/`) — React + Vite + TypeScript, React Router, plain
  CSS (no UI framework).
- **Database** — SQLite locally (zero install), Postgres on Render via a
  parallel schema file — see "Deploying to Render" below.

## Local setup

Requires Node 20+.

```bash
npm install                          # installs all three workspaces
cp server/.env.example server/.env   # defaults work as-is for local dev
npm run prisma:migrate               # creates server/prisma/dev.db
npm run dev                          # API on :4000, client on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the
Express server, so no extra configuration is needed.

## Project structure

```
shared/src/branchingRules.ts   step order + which steps apply (submitter type, HCP error branch)
shared/src/schemas.ts          zod schema per step, parameterized by submitter type
shared/src/documentSuggestions.ts   deterministic doc-suggestion heuristic (no AI — see design doc §6.8)
shared/src/faqData.ts          static FAQ entries, keyword search

server/prisma/schema.prisma    data model
server/src/routes/             reports (draft/patch/submit), attachments, surveys, faq
server/src/services/storage.ts local-disk file storage — swap point for S3/Render Disk later
server/src/services/duplicateHeuristic.ts

client/src/pages/report/       the multi-step wizard, one component per step
client/src/reportProgress.ts   where to resume a draft
client/src/components/         StepIndicator, FaqWidget, SurveyForm, Field primitives
```

## Known limitations / things to check before relying on this further

- **Dev-server CORS vulnerability (esbuild/Vite, moderate, GHSA-67mh-4wv8-2f99):**
  `npm audit` flags the Vite 5 dev server's bundled esbuild for allowing
  cross-origin requests to reach it while `npm run dev` is running. This only
  affects the local dev server, not the production build output. Fixing it
  requires upgrading to Vite 6 (`npm audit fix --force`), which wasn't done
  here to avoid destabilizing the build without you reviewing the change
  first — do that upgrade if you want it resolved.
- **FAQ widget can overlap page content** on very short pages (e.g. the
  branching-choice steps) since it's a fixed-position panel. Cosmetic only.
- **Draft access control is a prototype-grade opaque token, not real
  identity.** A report's draft is protected by a random capability token
  (`X-Draft-Token` header) issued once at creation and stored, hashed, on
  the report row — never a signed/self-verifying token, so it can't expire
  or be checked without a database lookup, and it can't be recovered if the
  browser's `localStorage` is cleared (there's deliberately no "email me a
  new one" recovery path for an in-progress draft — a real deployment would
  need one). It's enough to stop a stranger from reading or editing a
  draft merely by guessing/knowing its id, which is what the real risk here
  is; it is not equivalent to authenticating the *reporter's identity*, and
  a submitted report deliberately drops this check entirely (see
  `services/draftTokens.ts`) since the confirmation page and follow-up flow
  (a real two-step email+code identity check) both need it to survive a
  browser refresh with no token in hand.
- **Automated tests exist across all three packages** (Vitest for
  `shared`/`server`/`client`, Supertest for the API, React Testing Library
  for components) — this bullet used to say there were none; that's no
  longer true. There's still no Playwright end-to-end suite covering full
  submitter journeys through the browser, which is the next gap worth
  closing if you extend this.

## Deploying to Render

This prototype was built and verified locally only — the steps below are
the intended path, not something already executed against live Render
infrastructure. `render.yaml` is a best-effort Blueprint; Render's Blueprint
spec has changed over time, so check https://render.com/docs/blueprint-spec
before your first deploy.

### 1. Database: a second schema file, not a switch

Render's standard web services don't give you a persistent SQLite file, so
production needs Postgres. Rather than converting your only schema (which
would force you to run Postgres locally just to regenerate migrations),
`server/prisma/schema.production.prisma` is a parallel copy with the
datasource swapped to `postgresql` — `schema.prisma` (SQLite) stays untouched
for local dev. Render's build (`render.yaml`) runs `prisma db push` against
the production schema, which syncs the table structure directly without
needing a migrations directory. **The one thing to remember:** if you add or
change a model, update both files — nothing enforces they stay in sync.

### 2. First deploy and URL wiring

`render.yaml` provisions a Postgres database, the API as a web service, and
the client as a static site. The API and client each need to know the
other's URL (CORS origin / API base URL), which Render only assigns once
the services exist — so:

1. Deploy the blueprint once with the placeholder URLs left in
   `render.yaml`.
2. Copy the two services' real `.onrender.com` URLs from the Render
   dashboard.
3. Update `CLIENT_ORIGIN` (on `vaers-api`) and `VITE_API_URL` (on
   `vaers-client`) to those real URLs, then redeploy both — `VITE_API_URL`
   is baked in at build time, so the client needs a rebuild, not just a
   restart.

### 3. Set the Anthropic API key

`ANTHROPIC_API_KEY` is marked `sync: false` in `render.yaml` specifically so
it's never committed to the repo — Render will prompt for it the first time
you apply the blueprint, but that's not the only time you can set it. It's a
normal environment variable on the `vaers-api` service, so you can add or
change it whenever you want, with no blueprint re-apply needed:

**`vaers-api` service → Environment tab → find/add `ANTHROPIC_API_KEY` → paste
the key → Save Changes.** Saving triggers an automatic redeploy of just that
service (`vaers-client` doesn't need touching — the key is server-only).

Without it, the FAQ assistant and description-check features fail gracefully
(a normal error response, not a crash) — everything else still works. If
you've set it and it's still not working, the most common causes are a
trailing space/newline pasted along with the key, or the key being pasted
into the wrong service's Environment tab.

### 4. File uploads on Render

Render's standard web services have an **ephemeral filesystem** — anything
written to `server/uploads/` disappears on restart/redeploy. `server/src/services/storage.ts`
is deliberately isolated so this is a one-file fix, not a rearchitecture:
either attach a [Render Disk](https://render.com/docs/disks) and point
`UPLOAD_DIR` at its mount path, or swap the implementation for an
S3-compatible client. Do this before relying on uploads in anything beyond a
demo.
