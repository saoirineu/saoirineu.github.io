# Agentes e Customizacoes

## Arquivos de referencia para agentes

- `AGENTS.md`: instrucoes sempre ativas e canonicas para agentes neste workspace.
- `docs/arquitetura-frontend.md`: detalhamento do frontend que deve ser referenciado, nao duplicado.
- `docs/firestore-schema.md`: referencia de modelagem para alteracoes de dados e regras.

## Quando atualizar esses arquivos

Atualize os documentos quando houver mudanca em pelo menos um destes pontos:

- arquitetura principal do frontend
- comandos de build, execucao ou deploy
- areas sensiveis do repositorio que exigem mais cuidado
- convencoes de organizacao de codigo
- fluxo esperado para validacao de mudancas
- comandos de teste

## Regras praticas para agentes

- Ler o modulo vizinho antes de editar.
- Preferir mudancas pequenas e verificaveis.
- Nao espalhar acesso ao Firestore dentro de paginas quando um helper em `frontend/src/lib/` resolve melhor.
- Evitar `any` ao consumir dados do Firestore.
- Respeitar edicoes locais do usuario antes de refatorar arquivos grandes.

## Estrategia atual recomendada

- Refatorar paginas grandes em etapas: primeiro extrair helpers de estado e mapeamento, depois secoes visuais, depois componentes menores se ainda fizer sentido.
- Para performance, preferir lazy loading por rota e chunking controlado no Vite.
- Para dados, preferir funcoes de normalizacao compartilhadas a casts inline.

## Backlog de customizacoes

Guardar estes proximos passos para fazer depois:

- Criar uma instrucao especifica para mudancas de dados e regras do Firestore, apontando explicitamente quando consultar `docs/firestore-schema.md` e `firestore.rules`.
- Criar uma instrucao especifica de testes para frontend, padronizando quando exigir `cd frontend && npm run test`, `cd frontend && npm run lint` e `cd frontend && npm run build`.
- Revisar `AGENTS.md` para deixa-lo ainda mais enxuto e prescritivo, sem duplicar detalhes que ja estao nos docs de apoio.

## Comandos uteis

- `make serve`
- `make firestore-rules`
- `cd frontend && npm run build`
- `cd frontend && npm run test`
- `cd frontend && npm run lint`

## Observacao

Esses arquivos nao substituem documentacao de produto ou modelagem. Eles existem para reduzir erro operacional de agentes e manter coerencia nas mudancas automatizadas.