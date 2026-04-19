# Domain Vocabulary

Mapping between English identifiers used in code and the original Portuguese domain terms.
Intended to become a SKOS vocabulary / OWL ontology.

## People

| English (code)    | Portuguese (domain) | Notes |
|-------------------|---------------------|-------|
| `isInitiated`     | fardado             | Boolean — whether a member has received fardamento |
| `initiationDate`  | fardamentoData      | Date string (YYYY-MM-DD) |
| `initiationVenue` | fardamentoLocal     | Free-text place name |
| `initiationChurchId` | fardamentoIgrejaId | Reference to a church document |
| `initiationChurchName` | fardamentoIgrejaNome | Denormalized church name |
| `initiatorName`   | fardadorNome        | Name of the padrinho/madrinha who gave fardamento |
| `initiatedWith`   | fardadoComQuem      | Other people initiated at the same ceremony |
| `isSponsor`       | padrinhoMadrinha    | Boolean — whether the member acts as padrinho or madrinha |
| `sponsorChurchIds` | padrinhoIgrejasIds | Churches where the member sponsors initiates |
| `sponsorChurchNames` | padrinhoIgrejasNomes | Denormalized names |
| `doctrineRoles`   | papeisDoutrina      | Free-text roles in the doctrine (e.g. músico, fiscal) |
| `observations`    | observacoes         | General free-text notes |
| `currentChurchId` | igrejaAtualId       | |
| `currentChurchName` | igrejaAtualNome   | |
| `originChurchName` | igrejaOrigemNome   | |

## Sessions (Spiritual Works)

| English (code)         | Portuguese (domain)        | Notes |
|------------------------|----------------------------|-------|
| `Session`              | Trabalho                   | A spiritual work/ceremony |
| `session.date`         | trabalho.data              | Firestore field: `data` |
| `session.startTime`    | trabalho.horarioInicio     | Firestore field: `horarioInicio` |
| `expectedDurationMin`  | duracaoEsperadaMin         | Firestore field: `duracaoEsperadaMin` |
| `actualDurationMin`    | duracaoEfetivaMin          | Firestore field: `duracaoEfetivaMin` |
| `attendees.initiated`  | participantes.fardados     | Firestore field: `fardados` |
| `attendees.men`        | participantes.homens       | Firestore field: `homens` |
| `attendees.women`      | participantes.mulheres     | Firestore field: `mulheres` |
| `hymnals`              | hinarios                   | List of hymnal names used in the session |
| `venueId`              | localId                    | |
| `venueName`            | localNome                  | |
| `venueText`            | localTexto                 | Free-text for unregistered venues |
| `responsibleChurchIds` | igrejasResponsaveisIds     | |
| `responsibleChurchNames` | igrejasResponsaveisNomes | |
| `responsibleChurchText` | igrejasResponsaveisTexto  | |
| `notes`                | anotacoes                  | |

## Churches

| English (code)   | Portuguese (domain) | Notes |
|------------------|---------------------|-------|
| `Church`         | Igreja              | A ceremonial house / centro |
| `church.name`    | igreja.nome         | |
| `church.lineage` | igreja.linhagem     | e.g. ICEFLU, Barquinha, UdV |
| `observations`   | observacoes         | |

## Beverage Batches

| English (code)      | Portuguese (domain) | Notes |
|---------------------|---------------------|-------|
| `BeverageBatch`     | Lote de Bebida / Daime | The sacramental drink |
| `batch.description` | lote.descricao      | |
| `batchRef`          | loteRef             | |
| `batchId`           | loteId              | |
| `batchText`         | loteTexto           | Free-text for unregistered batches |
| `liters`            | quantidadeLitros    | |

## Church Usage Stats

| English (code)          | Portuguese (domain)   | Notes |
|-------------------------|-----------------------|-------|
| `sessionsVenue`         | trabalhosLocal        | Sessions where this church was the venue |
| `sessionsResponsible`   | trabalhosResponsavel  | Sessions where this church was responsible |
| `membersCurrentChurch`  | pessoasAtuais         | Members currently affiliated |
| `membersInitiationChurch` | pessoasFardamento   | Members who were initiated here |

## Collections (Firestore)

| English (collection name)          | Portuguese (original)        |
|------------------------------------|------------------------------|
| `users`                            | `usuarios`                   |
| `churches`                         | `igrejas`                    |
| `trabalhos`                        | `trabalhos` (name kept)      |
| `beverageBatches`                  | `bebidaLotes`                |
| `europeanGatheringRegistrations`   | `encontroEuropeuInscricoes`  |
| `europeanGatheringRooms`           | `encontroEuropeuQuartos`     |

## Notes

- Firestore field names inside `trabalhos` documents were **not** migrated
  (e.g. `data`, `horarioInicio`, `duracaoEsperadaMin`). The read mapper in
  `lib/sessions.ts` bridges them to English type fields.
- `fardado` / initiation-related fields in `users` documents were similarly
  not migrated at the Firestore level; the mapper in `lib/users.ts` bridges them.

---

## Remaining Work (0% → 100% migration)

### 1. TypeScript identifiers — `EuropeanGatheringPage.tsx` and `europeanGathering.ts`

| Location | Current | Target |
|----------|---------|--------|
| `lib/europeanGathering.ts:45,78` | `isFardado: boolean` (on `EuropeanGatheringRegistrationFormValues` and `EuropeanGatheringRegistrationRecord`) | `isInitiated: boolean` |
| `lib/europeanGathering.ts:262` | `isFardado: asOptionalBoolean(data.isFardado)` | `isInitiated: asOptionalBoolean(data.isFardado)` (Firestore field name `isFardado` stays until migrated) |
| `pages/EuropeanGatheringPage.tsx:57` | `fardado: string` (on copy type) | `initiated: string` |
| `pages/EuropeanGatheringPage.tsx:187,293,399,505` | `fardado: 'Fardado'` (copy objects for pt/en/es/it) | `initiated: '...'` |
| `pages/EuropeanGatheringPage.tsx:1481-1482` | `values.isFardado`, `setField('isFardado', ...)`, `copy.fardado` | `values.isInitiated`, `setField('isInitiated', ...)`, `copy.initiated` |
| `pages/EuropeanGatheringAdminPage.tsx:142,441,442` | `registration.isFardado` | `registration.isInitiated` |

### 2. Route path — `/trabalhos`

| Location | Current | Target |
|----------|---------|--------|
| `src/App.tsx:93` | `path="/trabalhos"` | `path="/sessions"` (or `/works`) |
| `src/components/NavBar.tsx:24` | `to: '/trabalhos'` | matching path |
| `src/pages/DashboardPage.tsx:122` | `to: '/trabalhos'` | matching path |

This is a user-visible URL change (bookmarks, links). Decide on the English slug first.

### 3. Firestore field-level migration — `trabalhos` collection

Fields still stored with Portuguese names in Firestore; bridged in `lib/sessions.ts`:

| Firestore field | English target | Bridge location |
|-----------------|----------------|-----------------|
| `data` | `date` | `sessions.ts:89` |
| `horarioInicio` | `startTime` | `sessions.ts:90` |
| `duracaoEsperadaMin` | `expectedDurationMin` | `sessions.ts:91` |
| `duracaoEfetivaMin` | `actualDurationMin` | `sessions.ts:92` |
| `attendees.fardados` | `attendees.initiated` | `sessions.ts:64` |
| `attendees.homens` | `attendees.men` | `sessions.ts:65` |
| `attendees.mulheres` | `attendees.women` | `sessions.ts:66` |

Action: add a `transformTrabalhoFields` step to `scripts/migrate.js` and run it.
After running, remove the bridge mappings in `lib/sessions.ts`.

### 4. Firestore field-level migration — `users` collection

Fields still stored with Portuguese names; bridged in `lib/users.ts`:

| Firestore field | English target | Bridge location |
|-----------------|----------------|-----------------|
| `fardado` | `isInitiated` | `users.ts:61,106` |
| `fardamentoDate` | `initiationDate` | `users.ts:63,107` |
| `fardamentoVenue` | `initiationVenue` | `users.ts:64,108` |
| `fardamentoChurchId` | `initiationChurchId` | `users.ts:65,109` |
| `fardamentoChurchName` | `initiationChurchName` | `users.ts:66,110` |
| `fardadorName` | `initiatorName` | `users.ts:67,111` |
| `fardadoComQuem` | `initiatedWith` | `users.ts:68,112` |
| `isPadrinho` | `isSponsor` | (already English in Firestore — migrated) |
| `padrinhoChurchIds` | `sponsorChurchIds` | `users.ts:70,114` |
| `padrinhoChurchNames` | `sponsorChurchNames` | `users.ts:71,115` |

Action: add a `transformUserFields` step to `scripts/migrate.js` and run it.
After running, remove the bridge mappings in `lib/users.ts`.

### 5. Firestore field — `europeanGatheringRegistrations` collection

| Firestore field | English target |
|-----------------|----------------|
| `isFardado` | `isInitiated` |

Action: add a transform step in `scripts/migrate.js` for `europeanGatheringRegistrations`.
After running, update `lib/europeanGathering.ts:262` to read `data.isInitiated`.
