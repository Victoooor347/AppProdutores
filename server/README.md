# API do AppProdutores

Implementação dos endpoints definidos em `contrato-api-rascunho.md`, conectando no Postgres (Neon).

## Como rodar

```bash
cd server
npm install
cp .env.example .env
```

Edite o `.env` e cole a connection string do seu banco Neon em `DATABASE_URL` (Dashboard do Neon → **Connection Details** → "Connection string", com `?sslmode=require` no final).

Rode o schema e o seed no banco (uma vez só, no SQL Editor do Neon ou via `psql`):
```bash
psql "$DATABASE_URL" -f ../db/schema.sql
psql "$DATABASE_URL" -f ../db/seed.sql
```

Depois, suba a API:
```bash
npm run dev
```

Vai subir em `http://localhost:3000`.

## Testando

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"52998224725","password":"123456"}'
```

Deve devolver `{ "user": {...}, "token": "...", "expires_in": 86400 }`. Usa esse `token` no header `Authorization: Bearer <token>` pra chamar as outras rotas.

## Conectando o app nela

No `.env` do app React Native (não desse servidor — é outro `.env`, na raiz do projeto do app):
```
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
```

⚠️ Não use `localhost` aí — o celular/emulador não entende "localhost" como sendo o seu computador. Use o IP da sua máquina na rede local (ex: `192.168.0.10`), com o celular na mesma rede Wi-Fi. Pra descobrir seu IP: `ipconfig` (Windows) ou `ifconfig`/`ip a` (Mac/Linux).

## Deploy (quando sair do teste local)

Esse servidor Express roda em qualquer lugar que rode Node: Railway, Render, Fly.io, um VPS, etc. Depois do deploy, troca o `EXPO_PUBLIC_API_URL` do app pra URL pública (ex: `https://sua-api.railway.app`) — nenhuma outra mudança é necessária.

## O que ainda falta (propositalmente fora do escopo aqui)
- Geração de PDF de verdade em `routes/relatorios.js` (hoje só simula com `setTimeout`)
- Rate limiting / proteção contra força bruta no login
- Testes automatizados