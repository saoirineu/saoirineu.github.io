# AGENTS

## Purpose

This repository contains a Firebase-backed knowledge app with a Vite/React/TypeScript frontend in `frontend/` plus documentation and ontology/data assets at the repository root.

Agents working here should optimize for small, verified changes and preserve user work already in progress.

## Architecture

- The frontend is the primary runtime surface.
- Keep Firebase Auth and Firestore access in `frontend/src/lib/`.
- Keep route pages thin: query orchestration, mutations, and composition in the page; form mapping and large JSX sections in nearby modules.
- Reuse shared normalization helpers such as `frontend/src/lib/firestoreData.ts` instead of duplicating Firestore shaping logic.
- See `docs/arquitetura-frontend.md` for detailed frontend structure and examples.
- See `docs/firestore-schema.md` when changing collections or document fields.

## Build And Test

- `make serve` starts the frontend dev server.
- `cd frontend && npm run build` is the primary validation command.
- `cd frontend && npm run test` runs the Vitest helper suite.
- `cd frontend && npm run lint` must stay clean; it runs with `--max-warnings 0`.
- `make firestore-rules` deploys Firestore rules.

## Conventions

- Prefer strict typing over `any` casts.
- Keep Portuguese UI copy and the existing Tailwind-heavy styling approach.
- Store pure form/payload helpers beside their page domain, using the `pages/<domain>/form.ts` pattern.
- Add tests around pure helpers before expanding refactors; current baseline lives beside the helper modules as `*.test.ts`.
- Link to existing docs instead of duplicating them in new instruction files.

## Safety

- Keep changes focused; do not reformat unrelated files.
- Check local changes before editing active feature files.
- Treat `frontend/src/lib/trabalhos.ts` and `frontend/src/pages/TrabalhosPage.tsx` as likely active work areas.
- Do not modify generated files unless they change as a result of a validated command.
- Use route-level lazy loading and domain splits before accepting bundle growth.

## Key Paths

- `frontend/src/lib/`: Firebase and Firestore access helpers
- `frontend/src/pages/`: route-level screens and nearby helper modules
- `frontend/src/components/`: reusable UI shell components
- `frontend/src/providers/`: auth and shared context state
- `docs/`: architecture, schema, and agent-facing reference docs

## Docs

- Update this file when commands, architectural boundaries, or sensitive areas change.
- Prefer linking `docs/arquitetura-frontend.md`, `docs/firestore-schema.md`, and `docs/agentes-e-customizacoes.md` instead of copying their content here.