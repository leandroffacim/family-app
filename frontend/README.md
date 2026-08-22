# Sistema Familiar — frontend

App React (Vite + TypeScript) do baralho de tarefas, agenda e
rodízio da família. Consome a API do backend serverless
(`sistema-familiar-backend`) — não tem dados mockados.

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite .env com a ApiUrl do output do `sam deploy` e o FamilyId usado no seed
npm run dev
```

## Variáveis de ambiente

| Variável | Onde pegar |
|---|---|
| `VITE_API_URL` | Output `ApiUrl` do `sam deploy` do backend |
| `VITE_FAMILY_ID` | O mesmo `FamilyId` passado no `sam deploy --guided` |

## Build de produção

```bash
npm run build
```

Gera um `dist/` estático — pode subir em qualquer hosting de site
estático (S3 + CloudFront, Vercel, Netlify, etc). Como é só
HTML/JS/CSS estático consumindo uma API via `fetch`, não precisa de
servidor próprio.

## O que está ligado na API de verdade

- **Baralho (aba Hoje)** — `GET /deck` + `POST /deck/{taskId}/decide`.
  Cada swipe chama a API de verdade; se a chamada falhar, a carta não
  sai do baralho (fica um aviso curto na tela).
- **Tarefas** — `GET/POST /tasks`. A roda de rodízio na aba Família
  mostra o `currentIndex` real vindo da API.
- **Agenda** — `GET/POST /events`, filtrando no cliente pela semana
  atual (calculada em America/Sao_Paulo).
- **Membros** — `GET /members`.

## O que ficou de fora (de propósito, por enquanto)

- Sem autenticação — mesma ressalva do backend.
- Sem contagem de tarefas concluídas por membro / streak — o backend
  ainda não expõe esse dado (ver README do backend).
- Sem edição/exclusão de tarefas e eventos — só criação e o fluxo do
  baralho.
