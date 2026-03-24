# Arquitetura do Frontend

## Visao geral

O frontend fica em `frontend/` e usa React 18, Vite, TypeScript, React Router, TanStack Query, Firebase Auth, Firestore e Tailwind CSS. A aplicacao e uma SPA com suporte a PWA e cache offline de assets.

## Entradas principais

- `frontend/src/main.tsx`: monta React, Query Client, AuthProvider e Router.
- `frontend/src/App.tsx`: define o shell da aplicacao e as rotas.
- `frontend/src/providers/AuthProvider.tsx`: centraliza sessao e autenticacao.

## Responsabilidades por pasta

- `frontend/src/pages/`: telas de rota.
- `frontend/src/components/`: componentes reutilizaveis de interface.
- `frontend/src/lib/`: acesso ao Firebase e Firestore, tipos de dominio e normalizacao de dados.
- `frontend/src/providers/`: contexto e estado transversal.
- `frontend/src/styles/`: entrada de estilos globais.

## Convencoes atuais

- Acesso ao Firestore deve ficar em `frontend/src/lib/`.
- Páginas devem orquestrar query, mutation e composicao visual; mapeamentos e trechos grandes de JSX devem ser extraidos para modulos vizinhos.
- Normalizacao de documentos e remocao de `undefined` devem reutilizar `frontend/src/lib/firestoreData.ts`.
- O texto da interface esta em portugues e o estilo segue Tailwind utilitario.

## Areas que merecem cuidado

- `frontend/src/pages/TrabalhosPage.tsx` e `frontend/src/lib/trabalhos.ts` sao areas de evolucao ativa.
- `frontend/tsconfig.tsbuildinfo` e arquivo gerado e so deve mudar como consequencia de build validado.

## Validacao recomendada

1. Diagnosticos do editor nos arquivos tocados.
2. `cd frontend && npm run build`
3. Separar avisos residuais de falhas reais.

## Estado atual da qualidade

- TypeScript estrito esta habilitado.
- O bundle principal ainda e relativamente grande por causa de dependencias de app e Firebase.
- Rotas ja usam lazy loading; quando necessario, prefira continuar quebrando codigo por rota ou dominio antes de relaxar avisos do build.