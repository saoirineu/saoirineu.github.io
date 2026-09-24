# Firestore - Schema e Regras

> Este documento mistura colecoes **implementadas** (com codigo em `frontend/src/lib/`) e
> esbocos **planejados** (sem codigo ainda). Os nomes de colecao abaixo refletem o que o
> codigo realmente usa; secoes sem backing de codigo estao marcadas como `(planejado — sem
> codigo ainda)`. Fonte de verdade para campos: os tipos em `frontend/src/lib/`.
>
> **Implementadas:** `users`, `churches`, `beverageBatches`, `trabalhos`, `members`, `events`
> (+ subcolecoes `registrations`/`capacity`), `users/{uid}/consents`, `sacramentItems`,
> `sacramentStocks`, `sacramentTransactions`, `churchManagers`, `catalogs`, `icefluDonations`, `mailQueue`.
> **Planejadas:** `pessoas`, `hinarios`, `hinos`, `conceitos`.
> **Removidas:** `europeanGatheringRegistrations` e `europeanGatheringRooms` (cutover do Encontro
> Europeu para `events/encontro-europeu-2026`; código e regras retirados — junho/2026).

## Colecoes

### mailQueue (fila de envio de email — so Cloud Functions)
Todo email do portal passa por aqui (`deliverOrQueue()` em `functions/src/mailQueueRuntime.ts`);
detalhes em [email-delivery.md](email-delivery.md#the-mail-queue). Nenhum cliente le ou escreve.
- kind, to: string[], subject, text
- guard: condicao reavaliada antes de cada tentativa (`docField` path/field/oneOf, ou `emailUnverified` uid)
- status: `pending` | `sent` | `cancelled` | `failed`; closedReason?
- attempts, nextAttemptAt (so enquanto `pending`), expiresAt, lastError?, lastErrorAt?, sentAt?
- createdAt, updatedAt
- ids: `verification-{uid}` (um por conta), `{kind}-{eventId}` para gatilhos (idempotente), automatico nos demais

### users (perfil do auth)
- uid (igual ao auth)
- systemRole: `user` | `useradmin` | `eventadmin` | `custodian` | `admin` | `superadmin` (campo legado/primario para compatibilidade). `eventadmin` (Parte 2, Fase 1 — entregue) cria/gerencia eventos; `admin`/`superadmin` o herdam. Ver `events-eventadmin-design.md` §1.
- systemRoles: array de privilegios, ex.: `["useradmin", "custodian"]`; ausencia ou `["user"]` significa usuario comum
- consentimentos (Parte 2, planejado): subcolecao `users/{uid}/consents/{id}` — ver secao "Parte 2" abaixo
- approvalStatus: `needs-profile` | `pending` | `approved` | `needs-info`
- approvalSubmittedAt, approvalApprovedAt, approvalApprovedBy
- displayName, email, email2, preferredCommunicationEmail (`login` | `secondary`), phone, mobile, avatarUrl
- memberId: id do documento em `members` usado para preencher o perfil quando o e-mail de login coincide
- identidade Cloud32/socio: surname, firstName, fullName, fiscalCode (codice fiscale para italianos, numero do documento de identidade para os demais), idType (`passport` | `idCard` | `other`, so na variante nao italiana), idTypeOther (texto livre quando idType = `other`), sex (`M` | `F`), birthDate, birthPlace, birthPlaceCode, birthProvince, birthProvinceCode, birthCountry, birthCountryCode, citizenship, citizenshipCountryCodes, nationality, profession
- residencia Cloud32/socio: address, postalCode, city, province, state, region, country, countryCode
- associacao Cloud32/socio: memberCode, memberStatus, group, category, cardNumber, cardExpiry, referenceSeat, originSociety, registrationRequestDate, registrationDate, renewalDate, cancellationDate, hasParticipatedInSantoDaimeWork, firstWorkDate, firstWorkChurchId, firstWorkChurchName, identityDocumentPrimaryName, identityDocumentPrimaryPath, identityDocumentSecondaryName, identityDocumentSecondaryPath, membershipFeeAmount
- doutrina: isInitiated, initiationDate, initiationVenue, initiationChurchId, initiationChurchName, initiatorName, initiatedWith, isSponsor, sponsorChurchIds, sponsorChurchNames, currentChurchId, currentChurchName, originChurchName, doctrineRoles, observations
- legado: gender, genderSelfDescription ainda podem existir em documentos antigos, mas o formulario nao coleta mais esses campos e os remove no proximo salvamento do perfil.
- createdAt, updatedAt

### pessoas (planejado — sem codigo ainda)
- nome, apelido?
- papeis: string[] (taxonomia SKOS)
- igrejaRef: ref(igrejas)?
- bio, contatos
- status: ativo/inativo
- createdAt, updatedAt

### churches
- nome
- localizacao: { cidade, uf, pais?, coords? }
- linhagem? (campo `lineage`: "ICEFLU" quando marcada como ICEFLU no formulario; senao o nome livre da outra linha)
- leaderName?, leaderEmail?, churchEmail?
- centros ICEFLU Italia catalogados no frontend e persistidos quando possivel: Casa Regina della Pace, Stella Azzurra, Casa Maria delle Rose, Luce di Misericordia, Estrela d'Oriente, Leone Bianco, Céu do Panda
- responsaveis: ref[](pessoas)
- contatos
- createdAt, updatedAt

### hinarios (planejado — sem codigo ainda)
- titulo
- autorRef: ref(pessoas)
- descricao
- temas: string[] (SKOS)
- createdAt, updatedAt

### hinos (planejado — sem codigo ainda)
- titulo
- hinarioRef: ref(hinarios)
- autorRef: ref(pessoas)
- tema: string[] (SKOS)
- letra, fonte, midiUrl?
- createdAt, updatedAt

### beverageBatches
- loteId (ex.: ano-localidade-seq)
- ano, localidade
- grau, concentracao
- insumos: { rainhaVariedade, jagubeVariedade, agua? }
- quantidade, recipiente, armazenamento, condicoesArmazenamento
- responsaveis: ref[](pessoas)
- destinoUso: ref[](igrejas) ou texto
- analiseSensorial: { cor, viscosidade, gosto, cheiro }
- analiseQuimica: { campos livres }
- createdAt, updatedAt

### trabalhos (registros de trabalhos realizados)
Registro de um trabalho ja feito, preenchido por um gestor da igreja (ver `churchManagers`).
Especificacao da reuniao de 2026-09-10 (item 2). Fonte de verdade: `frontend/src/lib/works.ts`.
Comportamento, permissoes e limitacoes: [work-records.md](work-records.md).
- churchId, churchName: igreja a que o registro pertence (fixa apos a criacao)
- date: `YYYY-MM-DD` (nao pode ser futura no formulario)
- workTypeId, workTypeLabel: tipo vindo de `catalogs/workTypes`; o label e copiado no momento do
  registro, pois a lista e editavel. `workTypeId == 'other'` usa `workTypeOther` (texto livre)
- venueText?, hymnalText?: luogo e innario, texto livre, opcionais
- attendees: { total, initiated } (inteiros, initiated <= total). Os "bianchi" (nao fardados)
  sao derivados como total - initiated e nao sao gravados
- sacrament?: { stockId, itemId, itemLabel? (datas do feitio em AAAA-MM-DD, formatadas na exibição), quantity, unit: `L`|`kg` }: lote de um estoque
  vinculado a igreja (`sacramentStocks.churchIds`); `kg` para itens `gel`. Obrigatorio no formulario
- contributions: { collected, icefluBrazilQuota } em euros (a quota inclui o feitio)
- reviewStatus: `pre-approved` | `reviewed`; reviewedAt?, reviewedBy? (so quando `reviewed`)
- createdBy, createdAt, updatedBy, updatedAt
- Efeito colateral: a Cloud Function `onWorkSacramentChange` mantem uma saida em
  `sacramentTransactions/work-{workId}` espelhando `sacrament` (criada, reescrita ou removida
  junto com o registro).
- Os dois documentos do prototipo antigo (titulo/hinarios/igrejasResponsaveis, sem `churchId`)
  so ficam visiveis a admins.

### icefluDonations (doacoes enviadas a ICEFLU Brasil)
Doacao que uma igreja enviou a ICEFLU Brasil, com comprovante. Item 3 da reuniao de 2026-09-10.
Mesmo modelo de acesso e revisao de `trabalhos`. Fonte de verdade: `frontend/src/lib/donations.ts`;
comportamento e limitacoes: [iceflu-donations.md](iceflu-donations.md).
- churchId, churchName (fixos apos a criacao)
- date: `YYYY-MM-DD`
- amount: number > 0 (euros)
- reason: `feitio` (copertura feitio) | `membership` (associativo) | `jurua` (Juruá)
- recipient: string (destinatario, texto livre)
- method: `bank-transfer` (bonifico) | `in-person` (a mano)
- receiptPath, receiptName: arquivo em Storage `churches/{churchId}/donations/{donationId}/receipt-*`
  (contabile della banca ou ricevuta del destinatario; PDF/JPG/PNG ate 10 MB; nao sobrescrevivel)
- reviewStatus: `pre-approved` | `reviewed`; reviewedAt?, reviewedBy?
- createdBy, createdAt, updatedBy, updatedAt

### churchManagers/{uid}
Vincula uma conta as igrejas em nome das quais ela registra trabalhos (primeiro passo do
"login como igreja", item 1.1 de 2026-09-10). Escrita so por admins.
- churchIds: string[] (1..30), churchNames: string[]
- email?, displayName? (denormalizados para o painel admin)
- updatedBy, updatedAt

### catalogs/{catalogId}
Listas de opcoes editaveis por admins; leitura para usuarios verificados.
- `catalogs/workTypes`: items: [{ id, label, category: `official`|`other`, active }]. Enquanto
  o documento nao existe, o app usa o rascunho `DEFAULT_WORK_TYPES` de `lib/workTypes.ts`
  (calendario oficial ainda a revisar). `other` e reservado e sempre oferecido no fim do menu.

### conceitos (planejado — sem codigo ainda; opcional, espelho SKOS/OWL)
- id (URI ou slug)
- label, definition, scopeNote, broader, narrower, related

### sacramentStocks / sacramentItems / sacramentTransactions (Sacramento)
Controle de estoque do Sacramento, acessivel ao papel `custodian` (e `admin`/`superadmin`).
Fonte de verdade dos campos: `frontend/src/lib/sacrament.ts`.
- `sacramentStocks/{id}`: name, location?, notes?, churchIds?, churchNames?, createdAt, updatedAt — locais/depositos
  de estoque. `churchIds` lista as igrejas que o estoque atende (pode ser mais de uma): os gestores delas usam
  o Daime dele nos registros de trabalho. So admins alteram o vinculo.
- `sacramentItems/{id}`: stockId, degree, concentration?, form (`liquid`|`gel`), originChurchId?,
  originChurchName?, responsiblePerson?, feitioDate?, feitioDateEnd?, notes?, createdAt, updatedAt.
- `sacramentTransactions/{id}`: itemId, stockId, type (`entry`|`exit`), date, missionaryName?,
  destinationChurchId?, destinationChurchName?, quantity, notes?, createdBy?, createdAt, workId?.
  Movimentos com `workId` (id `work-{workId}`) sao escritos pela Cloud Function a partir do registro
  de trabalho e nao se editam na pagina Sacramento.

### members (socios da associacao)
Colecao unificada a partir das tres planilhas em `data/members/` (registro do cloud,
import compilado e certificados "Primo Lavoro"). Gerada por `scripts/members/build-members.mjs`
e carregada por `scripts/members/seed-members.mjs`. Doc id = Codice Fiscale quando existe;
senao `email-<hash>` ou `name-<hash>`.
- identidade: surname, firstName, fullName, fiscalCode, sex, birthDate (ISO), birthPlace, birthProvince, birthCountry
- contato: email, email2, phone, mobile
- residencia: address, postalCode, city, province, region, country
- associacao: memberCode, memberStatus, group, category, cardNumber, cardExpiry, referenceSeat, originSociety, profession, nationality, citizenship
- datas: registrationRequestDate, registrationDate, renewalDate, cancellationDate
- certificados: firstWorkDate (data do certificado "Primo Lavoro" mais antigo; o array de certificados nao e guardado pois so traz a data)
- proveniencia/merge: sources[] ({ file: `complete`|`importer`|`certificates`, code (id do registro na fonte), line (linha 1-based na planilha) }), needsReview (bool), reviewReasons (string[]), conflicts ({ campo: string[] }), superseeded ({ campo: string[] } com valores antigos rejeitados automaticamente ou na revisao manual), possibleDuplicateIds (string[]), reviewedBy?, reviewedAt?, createdAt, updatedAt
- Precedencia de merge: `ELENCO COMPLETO SOCI CLOUD.xlsx` e a fonte principal — seus valores vencem e o importer (`ImporterAnagrafichePF compilato.xlsx`) so preenche campos ausentes; excecao e a data de iscrizione (`registrationDate`), na qual o importer tem precedencia. Valores distintos dentro da mesma fonte resolvem pelo registro mais recente; os descartados ficam em `superseeded[campo]`. Certificados ("Primo Lavoro") casam por email somente quando o nome do sujeito tambem confere (emails de familia sao compartilhados), depois por nome. Registros que compartilham email mas tem nomes claramente diferentes ficam separados e ligados via `possibleDuplicateIds`, com `reviewReasons` incluindo `family-email` para revisao manual na UI admin.

### europeanGatheringRegistrations / europeanGatheringRooms (removidas)
> **Retiradas (junho/2026).** O Encontro Europeu virou a primeira instância de `events`
> (`events/encontro-europeu-2026` + subcoleções `registrations`/`capacity`). As coleções
> bespoke `europeanGatheringRegistrations` e `europeanGatheringRooms`, a página admin dedicada,
> o gatilho de e-mail e as regras correspondentes foram removidos. Inscrições e capacidade agora
> vivem inteiramente sob `events/{eventId}`.

## Indices compostos sugeridos
- pessoas: papeis+status; igrejaRef+status
- churches: localizacao.cidade+localizacao.uf
- hinarios: autorRef; temas
- hinos: hinarioRef; autorRef; tema+hinarioRef
- beverageBatches: ano+localidade; grau+ano; responsaveis
- trabalhos: churchId (igualdade simples, indice automatico; a ordenacao por data e feita no cliente)
- events/{eventId}/registrations: status+submittedAt; attendanceMode+submittedAt
- members: needsReview+fullName; memberStatus+fullName (listagem e filtros admin)

## Regras (esboco)
- Leitura: `allow read: if true;` (ou restrita a auth conforme politicas de privacidade).
- Escrita geral: `allow create, update: if request.auth != null;` mais validacao de campos/tipos.
- trabalhos: leitura/escrita por admins ou por gestores da igreja do registro (`managesChurch`); gestores so
  gravam `pre-approved` (editar um registro revisado o devolve a `pre-approved`) e so excluem pre-aprovados;
  o lote precisa pertencer a um estoque vinculado a igreja. Nao ha leitura publica (valores e uso de Daime).
- beverageBatches: escrita apenas para responsaveis ou admins (claim).
- users: cada uid edita apenas seu perfil; leitura publica opcional.
- members: escrita apenas para admins; leitura para admins ou para o usuario autenticado cujo e-mail do token coincide com `email`/`email2` do documento (prefill do perfil; dados pessoais sensiveis).
- `users.systemRole`/`users.systemRoles` deve ser alterado apenas por superadmin; `useradmin` aprova usuarios (`approvalStatus`) mas nao concede privilegios. `renato.fabbri@gmail.com` atua como bootstrap superadmin.
- Storage (se usar): uploads apenas autenticados; path por uid ou por colecao; validar tipo/tamanho.

## Notas de modelagem
- Campos que referenciam taxonomias (papel, temas) devem usar labels/ids SKOS para alinhar UI/tooltips.
- `trabalhos` segue a especificacao de 2026-09-10: data, luogo, tipo de trabalho, innario, participantes (total/fardados), Daime (lote do estoque da igreja + quantidade), contributi raccolti e quota ICEFLU Brasile.
- Perfil do usuario cobre fardado? (bool), data e quem fardou (ref), igreja de fardamento e vinculos.
- Inscricoes de eventos vivem em `events/{eventId}/registrations` (anexos no Firebase Storage, path administrativo guardado); `events/{eventId}/capacity/{bucket}` eh o agregado publico de vagas.
- Ha privilegios administrativos cumulativos no app: `useradmin` aprova usuarios, `custodian` gerencia Sacramento, `eventadmin` cria/gerencia eventos, `admin` visualiza dados operacionais (e herda `eventadmin`), enquanto `superadmin` tambem gerencia privilegios de usuarios.
- Parte 1 (entregue) do encontro europeu: o formulario publico nao coleta mais `roomNumber`; mostra um agregado de "vagas de participacao" (soma de `europeanGatheringRooms`). A caucao (caution deposit) e derivada (30% do total) e exibida na UI, **nao** e armazenada em `contribution` (a regra de criacao fixa `contribution` em `{nights, lodging, spiritualWorks, extras, total}`). Trabalhos atuais: sex 25, sab 26, seg 28, qua 30 de setembro, 19:00.

## Parte 2 — planejado (ver `events-eventadmin-design.md`)

Ordem: `eventadmin` -> ledger de consentimento -> decisoes do dirigente -> eventos genericos.
Fase 1 (`eventadmin`) **entregue**; o restante ainda **nao existe** (verdade de projeto a implementar).

### Papel `eventadmin` (§1) — entregue
- `SystemRole` privilegiado, paralelo a `useradmin`/`custodian`. Cria/gerencia eventos;
  `admin`/`superadmin` herdam (`hasRequiredRole`/`isEventAdmin`).
- Regras: `isEventAdmin() = isAdmin() || hasStoredRole('eventadmin')`; `eventadmin` consta nas
  allow-lists `hasValidUserSystemRole`/`hasValidUserSystemRoles` (cap de tamanho = 6).
- Atribuicao na UI admin de usuarios (somente superadmin altera privilegios).

### `users/{uid}/consents/{id}` — ledger de consentimento informado (item A, §3) — Fase 2 entregue
- status: `pending` | `approved` | `rejected`
- uploadedAt, approvedAt?, approvedBy?, documentName, documentPath, eventId?
- Regra de validade: consentimento e exigido na inscricao quando nao ha consentimento `approved`
  ou o ultimo `approvedAt` tem mais de 12 meses (`consentRequired`, `CONSENT_VALIDITY_MONTHS = 12`;
  exatamente 12 meses ainda vale). Anchor de envelhecimento: o `approvedAt` mais recente `approved`.
- Maioridade: o formulario (adultos ou menores) e escolhido pelo `birthDate` do perfil
  (`consentFormVariant`, `CONSENT_MAJORITY_AGE = 18`); um consentimento enviado antes dos 18 anos
  deixa de valer no 18º aniversario (`consentValidUntil`). Derivado de `uploadedAt` + `birthDate`,
  sem campo novo no documento.
- Regras: dono cria `pending` (payload validado, `uploadedAt == request.time`); transicao para
  `approved`/`rejected` apenas por `isUserAdmin()`/`isEventAdmin()` (o fluxo do dirigente da Fase 3
  e server-side via callable). Leitura: dono/admin/eventadmin.
- Storage: o arquivo do consentimento fica em `events/{eventId}/registrations/{id}/consentDocument-*`
  (path da inscricao); o ledger apenas referencia esse `documentPath`/`documentName`.
- Pendente da Fase 3: aprovacao terminal do dirigente carimba o consentimento como `approved`.
  Ate la, `consentRequired` retorna `true` para todos (nenhum consentimento aprovado ainda).

### `events/{eventId}` — eventos genericos (item C, §2) — Fase 4a: doc + regras entregues
- **Doc id = slug** (Firestore garante unicidade). Lib `events.ts`: tipos, `slugify`,
  `validateEventInput`, CRUD. Regras: `read` se `isEventAdmin()` ou `status=='published'`;
  `write` se `isEventAdmin()`. Subcolecoes `registrations`/`capacity` ficam para a Fase 4c.
- title: { pt, en, es, it }; slug; status: `draft|published|closed|archived`; kind: `single|multi`
- capacityMode: `total|rooms`; totalSlots; rooms: [{ name, capacity }]
- cautionDepositRate (0..1, default 0.30); payment: { beneficiary, iban, swift, causale }
- works: [{ id, label{pt,en,es,it}, dateTime }]; pricing: { lodgingNightRate, mealsNightRate,
  extraLinen, worksByCount: { anyone[], initiated[], iceflu[] } }
- checkInSuggested, checkOutSuggested, registrationOpensAt, registrationClosesAt; createdBy
- Subcolecoes (Fase 4c.2 — regras + CRUD entregues; falta o renderer 4c.3):
  - `events/{eventId}/registrations/{regId}`: mesmos campos de `europeanGatheringRegistrations`
    hoje + `eventId` + `capacityBucket`. Regra: dono enquanto `pending` + eventadmin.
  - `events/{eventId}/capacity/{bucket}`: espelha `europeanGatheringRooms`
    (`capacity/reserved/available/updatedAt`); `capacityMode:'total'` usa bucket `total`, `rooms`
    usa um bucket por quarto. Leitura publica; escrita com invariante (ver hardening em
    `events-eventadmin-design.md` §7.3).
- Regras: `events/{id}` read se `published` ou `isEventAdmin()`, write se `isEventAdmin()`;
  registrations como hoje (dono cria/edita enquanto `pending`, admin gerencia); capacity
  transacional validado contra o doc do evento.
- Migracao (strangler): `events/encontro-europeu-2026` seedado das constantes atuais; pagina
  EG migra por ultimo. Encontro Europeu vira a primeira instancia de `events`.

### Decisao do dirigente em duas fases (item B, §4) — Fase 3 entregue
- `leaderApproval`: `approved` | `approved-interview` | `approved-psychologist` | `rejected`
  (as duas de entrevista nao sao terminais).
- `interview` (no doc da inscricao): { required: `none|standard|psychologist`,
  status: `awaiting|approved|rejected`, resolvedAt?, resolvedBy? }. Gravado server-side pela
  callable `leaderRespond` (Admin SDK — sem regra de cliente nova).
- Fase 2: a igreja de referencia envia `interviewOutcome` (`approved|rejected`) na mesma pagina
  tokenizada quando `interview.status == 'awaiting'`. O `eventadmin` ve o badge
  "Aguardando entrevista/psicólogo" no admin.
- Aprovacao terminal (direta `approved` ou fase 2 `approved`) carimba o consentimento do usuario
  (`users/{uid}/consents` com `eventId == registrationId`) como `approved` — fecha o
  comportamento interino da Fase 2.
