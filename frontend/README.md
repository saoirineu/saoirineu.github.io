# Pod Frontend

SPA PWA 100% client-side (GitHub Pages), usando React + Vite + TypeScript, Firebase Auth (Google / Email) e Firestore. Estilização com Tailwind e caching offline com `vite-plugin-pwa`.

## Requisitos
- Node 18+ e npm.
- Projeto Firebase configurado (Auth e Firestore habilitados). Storage opcional para anexos.

## Configuração
1) Crie `.env.local` com base em `.env.example` (valores do Firebase e `VITE_BASE_PATH` para o caminho do GitHub Pages).
2) Instale dependências:
	- `npm install`

## Scripts
- `npm run dev` – ambiente de desenvolvimento.
- `npm run build` – build de produção (inclui `tsc -b`).
- `npm run preview` – pré-visualização do build.
- `npm run lint` – checagem eslint.

## Estrutura
- `src/` – app React (routes, pages, providers, lib/firebase, estilos Tailwind).
- `public/` – ícone e manifest da PWA.
- `vite.config.ts` – base ajustável para GitHub Pages e configuração PWA.

## PWA
- `vite-plugin-pwa` gera service worker e manifest; `registerSW` está em `src/main.tsx`.
- Offline-first para HTML e assets; dados do Firestore dependem do cache local do SDK.

## Próximos passos
- Modelar coleções Firestore (pessoas, igrejas, hinarios, hinos, bebida/lotes) e regras de segurança.
- Implementar consultas paginadas e buscas com React Query + Firestore.
- Adicionar views de taxonomia SKOS e trilhas conceito → exemplos → fontes.
