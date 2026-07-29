# AppProdutores

App mobile (Expo / React Native) de acesso exclusivo para produtores, com telas de Dashboard, Relatórios, Contra-Notas e gestão de usuário.

## Stack

- [Expo](https://expo.dev) 54 / React Native 0.81 / React 19
- TypeScript
- React Navigation (bottom tabs + stack)
- `expo-secure-store` para persistência segura de sessão

## Pré-requisitos

- Node.js 18+
- npm
- App **Expo Go** no celular (ou emulador Android/iOS configurado)

## Como rodar

```bash
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android) ou a câmera (iOS), ou pressione `a` / `i` no terminal para abrir num emulador.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha quando a API de backend estiver disponível:

```bash
cp .env.example .env
```

| Variável | Obrigatória? | Descrição |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Não (ainda) | URL base da API. Enquanto não for definida, o app usa um **login mock local**. |

## Login (modo de desenvolvimento)

Como a API ainda não existe, use as credenciais mock para testar o fluxo de autenticação:

- **CPF:** `V`
- **Senha:** `V`

Esse atalho só funciona em modo de desenvolvimento (`__DEV__`) e desaparece automaticamente em uma build de produção. Com CPF/senha reais, a validação de formato de CPF (dígito verificador) e senha mínima (6 caracteres) é aplicada normalmente.

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento do Expo |
| `npm run android` / `npm run ios` / `npm run web` | Inicia direto numa plataforma específica |
| `npm run lint` | Roda o ESLint |
| `npm run lint:fix` | Roda o ESLint e corrige o que for possível automaticamente |
| `npm run format` | Formata todo o código com o Prettier |
| `npm run format:check` | Verifica formatação sem alterar arquivos (útil em CI) |

## Estrutura do projeto

```
src/
  assets/         Imagens e ícones usados nas telas
  components/     Componentes reutilizáveis (ex: barra de abas customizada)
  context/        Contextos React (autenticação)
  global/         Estilos e temas globais (cores, tipografia)
  pages/          Telas do app (Dashboard, Login, Relatórios, etc)
  routes/         Configuração de navegação (stack + tabs), incluindo a
                  lógica de rotas protegidas por autenticação
  services/       Camada de acesso à API (hoje com fallback mock)
  types/          Tipos TypeScript compartilhados
  utils/          Funções utilitárias (validação de CPF/senha)
```

## Autenticação


1. `src/pages/login` valida o formulário (`src/utils/validators.ts`) e chama `signIn` do `AuthContext`.
2. `AuthContext` (`src/context/authContext.tsx`) delega para `authService`, que usa a API real se `EXPO_PUBLIC_API_URL` estiver configurada, ou o mock local caso contrário.
3. A sessão é persistida com `expo-secure-store` (armazenamento criptografado do dispositivo).
4. `src/routes/index.routes.tsx` decide automaticamente entre a tela de Login e o app principal, com base no estado de autenticação — não existe navegação manual "pulando" o login.



## BACKEND/SERVER PARA USAR A API

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



