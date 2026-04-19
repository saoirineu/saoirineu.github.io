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
| `trabalhos`                        | `trabalhos` (collection name kept; all field names migrated) |
| `beverageBatches`                  | `bebidaLotes`                |
| `europeanGatheringRegistrations`   | `encontroEuropeuInscricoes`  |
| `europeanGatheringRooms`           | `encontroEuropeuQuartos`     |

## Migration status

All code identifiers, Firestore collection names, and Firestore field names are now in English.
No bridge mappings remain in the codebase.
