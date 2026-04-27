# English Refactor — Tracking File

## Goal
Rename all Portuguese identifiers (types, functions, variables, file names, Firestore collection/field references) to English.
Keep UI-facing strings, user-visible labels, and domain terms that have no clean English equivalent (e.g. `fardado`, `hinario`) flagged for case-by-case decision.

## Rules
- **Code identifiers** → English (types, functions, variables, constants, file names, folder names)
- **Firestore collection/field names** → flag before renaming; these require a data migration, not just a code change
- **UI strings / i18n keys** → out of scope for this refactor
- **Domain-specific terms** → decide case-by-case (see Glossary below)
- One module per commit; commit message: `refactor: rename <module> identifiers to English`

---

## Glossary — Domain Terms (decide before renaming)

| Portuguese | Candidate English | Decision |
|---|---|---|
| `trabalho` / `trabalhos` | — | ✅ keep as jargon |
| `usuario` / `usuarios` | `user` / `users` | ✅ rename |
| `igreja` / `igrejas` | `church` / `churches` | ✅ rename |
| `perfil` | `profile` | ✅ rename |
| `fardado` / `fardamento` / `fardador` | — | ✅ keep as jargon |
| `hinario` / `hinarios` | `hymnal` / `hymnals` | ✅ rename |
| `bebida` | `beverage` | ✅ rename (page already named BeveragePage) |
| `lote` / `lotes` | `batch` | ✅ rename |
| `encontroEuropeu` | `europeanGathering` | ✅ rename |
| `participantes` | `attendees` | ✅ rename |
| `anotacoes` | `notes` | ✅ rename |
| `titulo` | `title` | ✅ rename |
| `cidade` / `estado` / `pais` | `city` / `state` / `country` | ✅ rename |
| `linhagem` | `lineage` | ✅ rename |
| `observacoes` | `observations` | ✅ rename |
| `padrinho` / `madrinha` | — | ✅ keep as jargon |
| `papeisDoutrina` | `doctrineRoles` | ✅ rename |
| `localId` / `localNome` | `venueId` / `venueName` | ✅ rename |

---

## Firestore Collections — Migration Required Before Rename

These are Firestore collection/field names embedded in queries. Renaming them in code alone will break the app — a data migration script is needed first.

| Current name | New name | Status |
|---|---|---|
| `usuarios` (collection) | `users` | ✅ migrated |
| `trabalhos` (collection) | `trabalhos` (keep) | ✅ no migration needed |
| `igrejas` (collection) | `churches` | ✅ migrated |
| `bebidaLotes` (collection) | `beverageBatches` | ✅ migrated |
| `encontroEuropeuInscricoes` (collection) | `europeanGatheringRegistrations` | ✅ migrated |
| `encontroEuropeuQuartos` (collection) | `europeanGatheringRooms` | ✅ migrated |
| Field names within documents | many (see Glossary) | ⏳ pending migration |

> **Strategy**: rename code identifiers first (safe), then plan and run Firestore migrations separately.
> Collections are now in English in Firestore, code, and rules. Remaining cleanup: drop the empty legacy `usuarios`/`igrejas`/`bebidaLotes` collections in the Firebase console, then deploy `firestore.rules`.

---

## File / Folder Renames

| Current path | New path | Status |
|---|---|---|
| `src/lib/usuarios.ts` | `src/lib/users.ts` | ✅ done |
| `src/lib/trabalhos.ts` | `src/lib/trabalhos.ts` (keep) | ✅ no rename |
| `src/lib/encontroEuropeu.ts` | `src/lib/europeanGathering.ts` | ✅ done |
| `src/lib/encontroEuropeuUpload.ts` | `src/lib/europeanGatheringUpload.ts` | ✅ done |
| `src/pages/PerfilPage.tsx` | `src/pages/ProfilePage.tsx` | ✅ done |
| `src/pages/TrabalhosPage.tsx` | `src/pages/TrabalhosPage.tsx` (keep) | ✅ no rename |
| `src/pages/EncontroEuropeuPage.tsx` | `src/pages/EuropeanGatheringPage.tsx` | ✅ done |
| `src/pages/EncontroEuropeuAdminPage.tsx` | `src/pages/EuropeanGatheringAdminPage.tsx` | ✅ done |
| `src/pages/perfil/` | `src/pages/perfil/` (keep folder name) | ✅ internal renames done |
| `src/pages/trabalhos/` | `src/pages/trabalhos/` (keep) | ✅ internal renames done |
| `src/pages/encontro-europeu/` | `src/pages/european-gathering/` | ✅ done |

---

## Module Progress

### `src/lib/users.ts` (was `usuarios.ts`) ✅ DONE
- [x] Rename file
- [x] All type/function/variable renames
- [x] Mapping layer to Firestore Portuguese fields
- [x] Update all import sites

### `src/lib/trabalhos.ts` — file name kept, internal renames ✅ DONE
- [x] `ChurchInfo` (was `IgrejaInfo`), `BeverageInfo` (was `BebidaInfo`), `ChurchInput` (was `IgrejaInput`)
- [x] `churchesRef` (was `igrejasRef`)
- [x] `mapAttendees`, `mapBeverage`
- [x] `fetchChurches`, `createChurch`, `updateChurch`, `deleteChurch`, `fetchBeverageBatches`
- [x] `Trabalho` type: all fields renamed to English
- [x] `TrabalhoInput` updated
- [x] Mapping layers in `createTrabalho` / `updateTrabalho`

### `src/lib/europeanGathering.ts` (was `encontroEuropeu.ts`) ✅ DONE
- [x] Rename file
- [x] All `EncontroEuropeu*` types → `EuropeanGathering*`
- [x] All `encontroEuropeu*` functions/constants → `europeanGathering*`
- [x] Import from `europeanGatheringUpload`
- [x] Firestore collection string literals kept as-is (pending migration)

### `src/lib/europeanGatheringUpload.ts` (was `encontroEuropeuUpload.ts`) ✅ DONE
- [x] Rename file
- [x] All `EncontroEuropeu*` / `encontroEuropeu*` identifiers renamed

### `src/pages/ProfilePage.tsx` (was `PerfilPage.tsx`) ✅ DONE
- [x] Renamed file
- [x] Uses `fetchChurches` (was `fetchIgrejas`)
- [x] App.tsx updated

### `src/pages/perfil/form.ts` ✅ DONE
- [x] All form field names renamed to English

### `src/pages/perfil/PerfilSections.tsx` ✅ DONE
- [x] Uses `ChurchInfo` (was `IgrejaInfo`), `church.name` (was `igreja.nome`)

### `src/pages/churches/form.ts` ✅ DONE
- [x] `ChurchFormState` (was `IgrejaFormState`)
- [x] `ChurchUsageStats` (was `IgrejaUsageStats`)
- [x] `buildChurchPayload`, `prefillChurchForm`, `sortChurches`, `buildChurchUsageMap`
- [x] All Portuguese field names renamed

### `src/pages/churches/ChurchesSections.tsx` ✅ DONE
- [x] Uses `ChurchInfo`, `ChurchFormState`, `ChurchUsageStats`
- [x] Component names: `ChurchFormSection`, `ChurchCard`, `ChurchesListSection`

### `src/pages/ChurchesPage.tsx` ✅ DONE
- [x] All imports updated
- [x] Query key `['igrejas']` → `['churches']`

### `src/pages/TrabalhosPage.tsx` ✅ DONE
- [x] Imports `fetchChurches`, `fetchBeverageBatches`
- [x] Query key `['igrejas']` → `['churches']`, `['bebidaLotes']` → `['beverageBatches']`
- [x] All form field names updated

### `src/pages/trabalhos/form.ts` ✅ DONE
- [x] `TrabalhoFormState` fields all renamed to English
- [x] `totalAttendees` (was `totalParticipantes`)
- [x] `buildTrabalhoPayload`, `prefillTrabalhoForm` updated

### `src/pages/european-gathering/form.ts` (was `encontro-europeu/form.ts`) ✅ DONE
- [x] Folder renamed
- [x] `EuropeanGatheringFormValues` (was `EncontroEuropeuFormValues`)
- [x] `buildEuropeanGatheringPayload`, `validateEuropeanGatheringForm`, `initialEuropeanGatheringFormValues`

### `src/pages/EuropeanGatheringPage.tsx` (was `EncontroEuropeuPage.tsx`) ✅ DONE
- [x] Renamed file
- [x] All imports updated to new lib/form names
- [x] All local `EncontroEuropeu*` identifiers renamed

### `src/pages/EuropeanGatheringAdminPage.tsx` (was `EncontroEuropeuAdminPage.tsx`) ✅ DONE
- [x] Renamed file
- [x] All imports updated
- [x] All local `EncontroEuropeu*` identifiers renamed

### `src/providers/` ✅ already English
### `src/components/` ✅ already English

---

## Decisions (resolved)

| Term | Decision |
|---|---|
| `trabalho` | ✅ keep as jargon — file and type names unchanged |
| `encontroEuropeu` | ✅ rename to `europeanGathering` |
| `fardado` / `fardamento` | ✅ keep as jargon — only suffix-translate where mixed (e.g. `fardamentoDate`) |
| `padrinho` / `madrinha` | ✅ keep as jargon — only suffix-translate where mixed (e.g. `padrinhoChurchIds`) |
| `hinario` | ✅ rename to `hymnal` |

---

## Status Summary

| Area | Status |
|---|---|
| Providers | ✅ already English |
| Components | ✅ already English |
| Pages (English-named) | ✅ already English |
| `firestoreData.ts` | ✅ already English |
| `systemRole.ts` | ✅ already English |
| `siteLocale.ts` | ✅ already English |
| `firebase.ts` | ✅ already English |
| `users.ts` | ✅ done |
| `trabalhos.ts` | ✅ done (internal renames) |
| `europeanGathering.ts` | ✅ done |
| `europeanGatheringUpload.ts` | ✅ done |
| `ProfilePage.tsx` + `perfil/` | ✅ done |
| `TrabalhosPage.tsx` + `trabalhos/` | ✅ done (internal renames) |
| `EuropeanGatheringPage.tsx` + `european-gathering/` | ✅ done |
| `EuropeanGatheringAdminPage.tsx` | ✅ done |
| `ChurchesPage.tsx` + `churches/` | ✅ done |
| Firestore collection/field migration | ⏳ plan separately |
