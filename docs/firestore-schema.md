# Firestore - Schema e Regras (rascunho)

## Colecoes

### usuarios (perfil do auth)
- uid (igual ao auth)
- nomeExibicao
- email
- fardado: bool
- fardadoDesde: date?
- fardadoPor: ref(pessoas)?
- igrejaFardamento: ref(igrejas)?
- igrejasVinculos: ref[](igrejas)
- papeis: string[] (rótulos SKOS/OWL; ex.: "padrinho", "fardado", "membro")
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

## Indices compostos sugeridos
- pessoas: papeis+status; igrejaRef+status
- igrejas: localizacao.cidade+localizacao.uf
- hinarios: autorRef; temas
- hinos: hinarioRef; autorRef; tema+hinarioRef
- bebidaLotes: ano+localidade; grau+ano; responsaveis
- trabalhos: data+igrejasResponsaveis; data+createdBy; hinarios+data

## Regras (esboco)
- Leitura: `allow read: if true;` (ou restrita a auth conforme politicas de privacidade).
- Escrita geral: `allow create, update: if request.auth != null;` mais validacao de campos/tipos.
- trabalhos: permitir criar/editar se `request.auth.uid == resource.data.createdBy` ou tiver claim/role apropriada.
- bebidaLotes: escrita apenas para responsaveis ou admins (claim).
- usuarios: cada uid edita apenas seu perfil; leitura publica opcional.
- Storage (se usar): uploads apenas autenticados; path por uid ou por colecao; validar tipo/tamanho.

## Notas de modelagem
- Campos que referenciam taxonomias (papel, temas) devem usar labels/ids SKOS para alinhar UI/tooltips.
- `trabalhos` atende requisitos: um ou mais hinarios, uma ou mais igrejas responsaveis, local+data+horario, duracoes, anotacoes, participantes (homens/mulheres), bebida (lote+quantidade).
- Perfil do usuario cobre fardado? (bool), data e quem fardou (ref), igreja de fardamento e vinculos.
