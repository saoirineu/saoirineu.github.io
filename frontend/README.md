# Pod Frontend

SPA 100% client-side (GitHub Pages), usando React + Vite + TypeScript, Firebase Auth (Google / Email) e Firestore. Estilização com Tailwind.

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
- `public/` – ícones e arquivos estáticos.
- `vite.config.ts` – base ajustável para GitHub Pages e rotas estáticas.

## Próximos passos
- Modelar coleções Firestore (pessoas, igrejas, hinarios, hinos, bebida/lotes) e regras de segurança.
- Implementar consultas paginadas e buscas com React Query + Firestore.
- Adicionar views de taxonomia SKOS e trilhas conceito → exemplos → fontes.
