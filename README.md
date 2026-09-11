# AppProdutores

App mobile (Expo / React Native) de acesso exclusivo para produtores da Dickow Alimentos, com cotação do dia, relatório de safra (cargas), contra-notas e perfil do usuário.

O projeto tem **duas partes**, cada uma com seu próprio `package.json`:

```
AppProdutores/
  Projeto/     ← o app (React Native / Expo) — o que roda no celular
  server/      ← a API (Node/Express + Postgres) — implementação de referência do contrato
```

> ⚠️ Projeto em desenvolvimento. A API em `server/` é uma implementação de **teste/referência**, feita pra desenvolver o app sem esperar o backend definitivo — os dados reais devem vir do ERP da empresa (ver seção [API e próxima etapa](#api-e-próxima-etapa)).

## Stack

**App:**
- [Expo](https://expo.dev) 54 / React Native 0.81 / React 19 / TypeScript
- React Navigation (bottom tabs + stack)
- `expo-secure-store` para persistência segura de sessão
- `react-native-calendars` para o seletor de período nos filtros

**API de referência:**
- Node.js / Express
- PostgreSQL ([Neon](https://neon.tech))
- `pdfkit` para geração de relatórios em PDF

## Pré-requisitos

- Node.js 18+
- npm
- App **Expo Go** no celular (ou emulador Android/iOS configurado)
- Uma conta no [Neon](https://neon.tech) (ou outro Postgres) pra rodar a API de referência

## Como rodar

### 1. A API

```bash
cd server
npm install
cp .env.example .env
```

Edite o `.env` e cole a connection string do seu banco em `DATABASE_URL` (Dashboard do Neon → **Connection Details**, com `?sslmode=require` no final).

Rode o schema e os dados de teste (uma vez só, no SQL Editor do Neon ou via `psql`):
```bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f seed.sql
```

Suba a API:
```bash
npm run dev
```
Vai subir em `http://localhost:3000`.

### 2. O app

```bash
cd Projeto
npm install
cp .env.example .env
```

No `.env` do app, aponte pra API que você acabou de subir:
```
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
```

⚠️ Não use `localhost` — o celular não entende isso como "seu computador". Use o IP da sua máquina na rede local (`ipconfig` no Windows, `ifconfig`/`ip a` no Mac/Linux), com o celular na mesma rede Wi-Fi.

```bash
npx expo start
```
Escaneia o QR code com o Expo Go, ou pressiona `a`/`i` no terminal pra abrir num emulador.

## Login de teste

Com o `seed.sql` rodado, use:
- **CPF:** `529.982.247-25`
- **Senha:** `123456`

Sem `EXPO_PUBLIC_API_URL` configurada, o app cai automaticamente num modo mock local — nesse caso (só em modo de desenvolvimento), CPF `V` e senha `V` também funcionam como atalho.

## Scripts disponíveis

**Dentro de `Projeto/`:**

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento do Expo |
| `npm run android` / `npm run ios` / `npm run web` | Inicia direto numa plataforma específica |
| `npm run lint` / `npm run lint:fix` | Roda o ESLint |
| `npm run format` / `npm run format:check` | Roda o Prettier |

**Dentro de `server/`:**

| Comando | O que faz |
|---|---|
| `npm start` | Sobe a API normalmente |
| `npm run dev` | Sobe a API com reload automático ao salvar |

## Estrutura do app (`Projeto/src`)

```
assets/         Imagens (logo, ícones, fundo do card de cotações)
components/     Peças reutilizáveis: AppHeader, SelectField, DateRangeField, CustomTabBar
context/        AuthContext — quem está logado, token, signIn/signOut
global/         Cores e estilos compartilhados (themes.tsx)
pages/          As telas: login, dashboard, relatorios, contraNotas, users
routes/         Navegação (stack + tabs) e a lógica de rotas protegidas
services/       Camada de acesso à API — um arquivo por domínio, cada um com
                fallback automático pra dados mock quando a API não está configurada
types/          Tipos TypeScript compartilhados
utils/          Formatação (moeda, data), validação de CPF/senha, máscara de período
```

## Estrutura da API (`server/src`)

```
db.js               Conexão com o Postgres
middleware/auth.js   Confere o token em toda rota protegida
routes/              Um arquivo por domínio: auth, me, precos, cargas, relatorios, contraNotas
utils/asyncHandler.js  Garante que erro em rota async cai certinho no tratamento de erro
```

`schema.sql` e `seed.sql`, na raiz de `server/`, criam as tabelas e populam dados de teste.

## Autenticação

1. `pages/login` valida o formulário (`utils/validators.ts` — CPF com dígito verificador, senha mínima) e chama `signIn` do `AuthContext`.
2. `AuthContext` delega pro `authService`, que usa a API real se `EXPO_PUBLIC_API_URL` estiver configurada, ou o mock local caso contrário.
3. A sessão fica persistida com `expo-secure-store` (armazenamento criptografado do dispositivo).
4. `routes/index.routes.tsx` decide automaticamente entre a tela de Login e o app principal, com base no estado de autenticação — não existe navegação manual "pulando" o login.
5. Logout invalida o token também no servidor (não só localmente no celular).

## Telas

| Tela | O que mostra |
|---|---|
| **Dashboard** | Cotação do dia (Arroz/Soja), com data da última atualização |
| **Relatório de Safra** | Cargas entregues, filtráveis por ano / IE / cultura / período (calendário), com seleção múltipla e geração de PDF combinado |
| **Contra-Notas** | Lista de notas fiscais com link direto pro PDF |
| **Perfil** | Dados do produtor (nome, telefone, propriedade — CPF não editável) e logout |

## API e próxima etapa

O contrato completo de endpoints está documentado em `contrato-api-rascunho.md`. A API em `server/` é uma implementação de referência — os dados reais de produção devem vir do ERP que a empresa já usa. Qualquer API de produção só precisa **respeitar o mesmo contrato** (rotas, formato de resposta, autenticação) pra o app funcionar sem nenhuma mudança de código — troca-se só o `EXPO_PUBLIC_API_URL`.

## O que ainda falta

- Geração de PDF de verdade (hoje simulada) e armazenamento durável dos arquivos (hoje é local em disco — não sobrevive a um redeploy)
- Refresh automático de token antes de expirar
- Conectar a API numa fonte de dados de produção (ver seção acima)
- Rate limiting / proteção contra força bruta no login
- Testes automatizados
- Definir nome final do app e ícone/identidade visual