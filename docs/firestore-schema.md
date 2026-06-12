# Firestore - Schema e Regras (rascunho)

## Colecoes

### usuarios (perfil do auth)
- uid (igual ao auth)
- systemRole: `user` | `admin` | `superadmin`
- displayName, email, email2, phone, mobile, avatarUrl
- memberId: id do documento em `members` usado para preencher o perfil quando o e-mail de login coincide
- identidade Cloud32/socio: surname, firstName, fullName, fiscalCode, sex, birthDate, birthPlace, birthProvince, birthCountry, citizenship, nationality, profession
- residencia Cloud32/socio: address, postalCode, city, province, state, region, country
- associacao Cloud32/socio: memberCode, memberStatus, group, category, cardNumber, cardExpiry, referenceSeat, originSociety, registrationRequestDate, registrationDate, renewalDate, cancellationDate, firstWorkDate, identityDocumentPrimaryName, identityDocumentSecondaryName, membershipFeeAmount
- doutrina: isInitiated, initiationDate, initiationVenue, initiationChurchId, initiationChurchName, initiatorName, initiatedWith, isSponsor, sponsorChurchIds, sponsorChurchNames, currentChurchId, currentChurchName, originChurchName, doctrineRoles, observations
- createdAt, updatedAt

### pessoas
- nome, apelido?
- papeis: string[] (taxonomia SKOS)
- igrejaRef: ref(igrejas)?
- bio, contatos
- status: ativo/inativo
- createdAt, updatedAt

### igrejas
- nome
- localizacao: { cidade, uf, pais?, coords? }
- linhagem?
- responsaveis: ref[](pessoas)
- contatos
- createdAt, updatedAt

### hinarios
- titulo
- autorRef: ref(pessoas)
- descricao
- temas: string[] (SKOS)
- createdAt, updatedAt

### hinos
- titulo
- hinarioRef: ref(hinarios)
- autorRef: ref(pessoas)
- tema: string[] (SKOS)
- letra, fonte, midiUrl?
- createdAt, updatedAt

### bebidaLotes
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

### trabalhos (eventos/atividades)
- titulo (opcional)
- hinarios: ref[](hinarios)
- igrejasResponsaveis: ref[](igrejas)
- local: string ou ref(lugares)
- data: date (dia)
- horarioInicio: timestamp
- duracaoEsperadaMin: number
- duracaoEfetivaMin: number?
- anotacoes: string
- participantes: { homens: number, mulheres: number, outros?: number }
- bebida: { loteRef: ref(bebidaLotes), quantidadeLitros: number }
- createdBy: uid
- createdAt, updatedAt

### conceitos (opcional espelho SKOS/OWL)
- id (URI ou slug)
- label, definition, scopeNote, broader, narrower, related

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

### encontroEuropeuInscricoes
- locale: `pt` | `en` | `es` | `it`
- firstName, lastName, country
- church, centerLeader
- isFardado: bool
- isIcefluMember: bool
- isNovice: bool
- attendanceMode: `lodging` | `meals` | `spiritual`
- checkIn, checkOut: string ISO curta (`YYYY-MM-DD`), opcionais quando a modalidade nao envolve permanencia
- selectedWorks: string[] com ids dos trabalhos espirituais selecionados
- needsExtraLinen: bool
- roomNumber: string?
- identityDocumentName, paymentProofName, consentDocumentName: string?
- identityDocumentPath, paymentProofPath, consentDocumentPath: string? com path no Firebase Storage para download administrativo
- contribution: { nights, lodging, spiritualWorks, extras, total }
- status: `pending` | `approved` | `under-review` | `payment-overdue` | `rejected` | `archived`
- submittedAt

### encontroEuropeuQuartos
- doc id: `Cedro` | `Luce` | `Aurora` | `Bosco` | `Fonte` | `Monte` | `Stella`
- capacity: number fixa por quarto
- reserved: total de vagas bloqueadas por inscricoes `pending`, `under-review` e `approved`
- available: `capacity - reserved`
- updatedAt

## Indices compostos sugeridos
- pessoas: papeis+status; igrejaRef+status
- igrejas: localizacao.cidade+localizacao.uf
- hinarios: autorRef; temas
- hinos: hinarioRef; autorRef; tema+hinarioRef
- bebidaLotes: ano+localidade; grau+ano; responsaveis
- trabalhos: data+igrejasResponsaveis; data+createdBy; hinarios+data
- encontroEuropeuInscricoes: status+submittedAt; attendanceMode+submittedAt
- encontroEuropeuQuartos: sem indice composto; leitura publica por doc/listagem simples
- members: needsReview+fullName; memberStatus+fullName (listagem e filtros admin)

## Regras (esboco)
- Leitura: `allow read: if true;` (ou restrita a auth conforme politicas de privacidade).
- Escrita geral: `allow create, update: if request.auth != null;` mais validacao de campos/tipos.
- trabalhos: permitir criar/editar se `request.auth.uid == resource.data.createdBy` ou tiver claim/role apropriada.
- bebidaLotes: escrita apenas para responsaveis ou admins (claim).
- usuarios: cada uid edita apenas seu perfil; leitura publica opcional.
- members: leitura e escrita apenas para admins (dados pessoais sensiveis).
- `usuarios.systemRole` deve ser alterado apenas por superadmin; `renato.fabbri@gmail.com` atua como bootstrap superadmin.
- Storage (se usar): uploads apenas autenticados; path por uid ou por colecao; validar tipo/tamanho.

## Notas de modelagem
- Campos que referenciam taxonomias (papel, temas) devem usar labels/ids SKOS para alinhar UI/tooltips.
- `trabalhos` atende requisitos: um ou mais hinarios, uma ou mais igrejas responsaveis, local+data+horario, duracoes, anotacoes, participantes (homens/mulheres), bebida (lote+quantidade).
- Perfil do usuario cobre fardado? (bool), data e quem fardou (ref), igreja de fardamento e vinculos.
- `encontroEuropeuInscricoes` recebe inscricoes anonimas via pagina publica; leitura fica restrita a admins. Os anexos agora sobem ao Firebase Storage e a inscricao guarda o path administrativo de download.
- `encontroEuropeuQuartos` eh um agregado publico para mostrar apenas disponibilidade de vagas no formulario, sem expor dados pessoais das inscricoes.
- Ha dois niveis administrativos no app: `admin` visualiza dados operacionais, enquanto `superadmin` tambem gerencia papeis de usuarios.
