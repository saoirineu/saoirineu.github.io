# saoirineu

A Firebase-backed knowledge and membership app for a Santo Daime community: member
records, churches, events and registrations (e.g. the European Gathering / Encontro
Europeu), sacrament stock control, and supporting documentation/ontology assets.

The product description (in Portuguese) lives in [docs/descricao.md](docs/descricao.md).

## Stack

- **Frontend** — React 18 + Vite + TypeScript SPA, React Router, TanStack Query, Tailwind
  CSS. Deployed as a static site to GitHub Pages. Lives in [`frontend/`](frontend/).
- **Backend** — Firebase: Auth (Google / Email), Firestore, Storage, and Cloud Functions
  (TypeScript) in [`functions/`](functions/). Security rules in
  [`firestore.rules`](firestore.rules) and [`storage.rules`](storage.rules).
- **Scripts** — Node maintenance/seed/migration scripts in [`scripts/`](scripts/).
- Firebase project: `sao-irineu`.

## Repository layout

| Path | What |
|---|---|
| `frontend/` | React SPA (see [`frontend/README.md`](frontend/README.md)) |
| `frontend/src/lib/` | Firebase/Firestore access, domain types, normalization helpers |
| `frontend/src/pages/` | Route-level screens + nearby `pages/<domain>/form.ts` helpers |
| `functions/` | Cloud Functions (leader-review callable, email) |
| `scripts/` | Backup, member import, seed/migration scripts |
| `docs/` | Architecture, Firestore schema, design docs, brand assets |
| `data/`, `ontologia/`, `vocabularios/` | Datasets and SKOS/OWL ontology assets |
| `firestore.rules`, `storage.rules` | Security rules |
| `Makefile` | Dev server + deploy/maintenance targets |

## Getting started

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in Firebase config + VITE_BASE_PATH
```

Run the dev server (from the repo root):

```bash
make serve          # http://localhost:5174  (npm --prefix frontend run dev)
```

Public Firebase config is injected at build time. In CI it comes from GitHub Actions
Repository Variables; locally from `.env.local`. See
[`frontend/README.md`](frontend/README.md) for the full variable list. Private keys, SMTP
credentials, and tokens are **not** `VITE_*` — they live in Firebase Secrets / GitHub
Secrets / gitignored local files.

## Build, test, lint

```bash
cd frontend
npm run build       # tsc -b && vite build  (primary validation)
npm run test        # vitest helper suite
npm run lint        # eslint, runs with --max-warnings 0

cd ../functions
npm run build       # tsc
npm run test        # tsc && node --test
```

## Deploy

The frontend deploys to GitHub Pages via GitHub Actions on push. Backend pieces deploy via
the Makefile:

```bash
make firestore-rules    # deploy Firestore rules
make storage-rules      # deploy Storage rules
make firebase-rules     # both rule sets
make deploy-functions   # build + deploy Cloud Functions
make deploy-backend     # rules + functions
```

Other useful targets: `make backup`, `make leader-link`, `make seed-leader-demo`. Run
`make` with no target list or read the [`Makefile`](Makefile) for the rest.

## Docs & conventions

- [AGENTS.md](AGENTS.md) — canonical working conventions (architecture boundaries, build/test
  commands, sensitive areas). Read this before contributing.
- [docs/arquitetura-frontend.md](docs/arquitetura-frontend.md) — frontend structure.
- [docs/firestore-schema.md](docs/firestore-schema.md) — Firestore collections and rules.
- [docs/events-eventadmin-design.md](docs/events-eventadmin-design.md) — generic events,
  `eventadmin` role, consent ledger, leader decisions (as-built design record).
- [docs/archive/](docs/archive/) — completed/retired tracking docs.

## Roadmap

High priority
- Seed the database with the churches.
- Limit upload file size and/or compress/shrink uploaded files.

Medium priority
- Site color palette.
- Make the site mobile-friendly.

Beyond the European Gathering
- A better model for describing churches and addresses.
- Resolve the church↔people linkage ambiguity (a church links to people such as leaders,
  while people also link to churches — which is authoritative?).

Low priority
- Test PWA behavior.
