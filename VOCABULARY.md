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

## Works (Spiritual Works / Ceremonies)

| English (code)         | Portuguese (domain)        | Notes |
|------------------------|----------------------------|-------|
| `Work`                 | Trabalho (realizado)       | Record of a work already held (Italian: lavoro fatto) |
| `work.churchId`        | trabalho.igrejaId          | Church the record belongs to |
| `work.date`            | trabalho.data              | `YYYY-MM-DD` |
| `workTypeId` / `workTypeLabel` | tipoTrabalho       | From `catalogs/workTypes` (calendário oficial, cura, São Miguel, mesa branca, umbandaime); `other` + `workTypeOther` |
| `venueText`            | localTexto                 | Free-text place (luogo) |
| `hymnalText`           | hinarioTexto               | Free-text hymnal(s) (innario) |
| `attendees.total`      | participantes.total        | |
| `attendees.initiated`  | participantes.fardados     | Whites (bianchi / não fardados) = total − fardados, derived |
| `sacrament.itemId` / `quantity` | daimeUsado / quantidade | Batch from a stock linked to the church; `unit` L or kg |
| `contributions.collected` | contribuicoesRecebidas  | EUR |
| `contributions.icefluBrazilQuota` | cotaIcefluBrasil | EUR, includes feitio |
| `reviewStatus`         | estadoRevisao              | `pre-approved` (pré-aprovado) or `reviewed` (revisado e aprovado) |
| `ChurchManager`        | gestorDaIgreja             | `churchManagers/{uid}`: account acting for a church |

## Donations to ICEFLU Brazil

| English (code)      | Portuguese / Italian (domain)            | Notes |
|---------------------|------------------------------------------|-------|
| `Donation`          | doação à ICEFLU Brasil / donazione       | `icefluDonations/{id}` |
| `amount`            | valor / importo                          | EUR |
| `reason`            | motivo / causale                         | `feitio` (copertura feitio), `membership` (associativo), `jurua` (Juruá) |
| `recipient`         | destinatário / destinatario              | Free text |
| `method`            | forma de envio / modalità                | `bank-transfer` (bonifico), `in-person` (a mano) |
| `receiptPath`       | comprovante / contabile, ricevuta        | Bank statement for a transfer, recipient's receipt by hand |

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
| `worksVenue`            | trabalhosLocal        | Works where this church was the venue |
| `worksResponsible`      | trabalhosResponsavel  | Works where this church was responsible |
| `membersCurrentChurch`  | pessoasAtuais         | Members currently affiliated |
| `membersInitiationChurch` | pessoasFardamento   | Members who were initiated here |

## Collections (Firestore)

| English (collection name)          | Portuguese (original)        |
|------------------------------------|------------------------------|
| `users`                            | `usuarios`                   |
| `churches`                         | `igrejas`                    |
| `trabalhos`                        | `trabalhos` (collection name kept; all field names migrated) |
| `churchManagers`                   | `gestoresIgrejas`            |
| `catalogs`                         | `catalogos`                  |
| `icefluDonations`                  | `doacoesIceflu`              |
| `beverageBatches`                  | `bebidaLotes`                |
| `europeanGatheringRegistrations`   | `encontroEuropeuInscricoes`  |
| `europeanGatheringRooms`           | `encontroEuropeuQuartos`     |

## Migration status

All code identifiers, Firestore collection names, and Firestore field names are now in English.
No bridge mappings remain in the codebase.
