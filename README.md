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
- [Expo](https://expo.dev) SDK 57 / React Native 0.86 / React 19.2 / TypeScript 6
- React Navigation (bottom tabs + stack)
- `expo-secure-store` para persistência segura de sessão
- `react-native-calendars` para o seletor de período nos filtros

**API de referência:**
- Node.js / Express
- PostgreSQL ([Neon](https://neon.tech))
- `pdfkit` para geração de relatórios em PDF

## Pré-requisitos

- Node.js 22.22 ou mais novo (o React Native 0.86 aceita a partir do 20.19, mas o `lint-staged`, usado no commit, exige 22.22)
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

**Banco criado antes de 29/09/2026?** Rode também as migrações da pasta `server/migracoes/`, em ordem de data (cada uma pode ser rodada de novo sem problema). Banco novo, criado com o `schema.sql` atual, não precisa.

**E-mail (opcional em desenvolvimento):** os códigos de primeiro acesso e recuperação de senha são enviados por SMTP, configurado no `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — exemplos no `.env.example`). Com `SMTP_HOST` vazio, nada é enviado: o e-mail, com o código, aparece no terminal da API.

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

As contra-notas de teste abrem um **PDF de exemplo** gerado pela própria API (o link delas começa com `/arquivos/contra-notas/exemplo/`). Na produção, cada link aponta pro PDF real, vindo do ERP.

Para testar o **Primeiro acesso**, use o CPF `111.444.777-35` — ele está cadastrado, mas ainda sem senha. Na tela de login, toque em "Primeiro acesso? Crie sua senha". Sem SMTP configurado, o código aparece no terminal da API. Para voltar esse usuário ao estado "sem senha" e testar de novo: `UPDATE users SET password_hash = NULL WHERE cpf = '11144477735';`

O app não tem mais modo offline/mock: sem `EXPO_PUBLIC_API_URL` configurada, ele mostra uma mensagem avisando que o endereço do servidor não está configurado.

## Scripts disponíveis

**Dentro de `Projeto/`:**

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento do Expo |
| `npm run android` / `npm run ios` / `npm run web` | Inicia direto numa plataforma específica |
| `npm test` | Roda os testes automatizados (Jest) |
| `npm run lint` / `npm run lint:fix` | Roda o ESLint |
| `npm run format` / `npm run format:check` | Roda o Prettier |

**Dentro de `server/`:**

| Comando | O que faz |
|---|---|
| `npm start` | Sobe a API normalmente |
| `npm run dev` | Sobe a API com reload automático ao salvar |

## Estrutura do app (`Projeto/src`)

```
assets/         Imagens usadas nas telas (logo, fundo do card de cotações)
components/     Peças reutilizáveis: AppHeader, SelectField, DateRangeField, CustomTabBar
context/        AuthContext — quem está logado, token, signIn/signOut, sessão expirada
global/         Cores e estilos compartilhados (themes.tsx, styles.ts)
pages/          As telas: login, solicitarCodigo e confirmarCodigo (primeiro acesso /
                recuperação de senha), dashboard, relatorios, contraNotas, users
routes/         Navegação (stack + tabs) e a lógica de rotas protegidas
services/       Camada de acesso à API — api.ts (requisições, erros, token) e um
                arquivo por domínio, que converte a resposta da API pro formato do app
types/          Tipos TypeScript compartilhados (inclusive as telas e parâmetros da navegação)
utils/          Formatação (moeda, data), validação de CPF/senha/código, marcação do período no
                calendário, opções dos filtros (anos) e espera/abertura dos PDFs gerados (pdfJob)
```

Os testes ficam em pastas `__tests__` ao lado do código testado (`services/__tests__`, `utils/__tests__`).

Os ícones do app e a imagem da tela de abertura ficam em `Projeto/assets/` (fora do `src`), como o `app.json` espera. Os atuais são **provisórios**, gerados a partir do `logo.png`.

## Estrutura da API (`server/src`)

```
db.js               Conexão com o Postgres
middleware/auth.js   Confere o token em toda rota protegida
routes/              Um arquivo por domínio: auth, me, precos, cargas, relatorios, contraNotas
services/            pdfService (PDF do relatório, PDFs de exemplo e junção de PDFs das
                     contra-notas), emailService (envio por SMTP) e
                     codigoService (códigos de primeiro acesso / recuperação de senha)
utils/asyncHandler.js  Garante que erro em rota async cai certinho no tratamento de erro
```

`schema.sql` e `seed.sql`, na raiz de `server/`, criam as tabelas e populam dados de teste. A pasta `server/migracoes/` tem as mudanças de banco para quem já tinha o banco criado.

## Autenticação

1. `pages/login` valida o formulário (`utils/validators.ts` — CPF com dígito verificador, senha mínima) e chama `signIn` do `AuthContext`.
2. `AuthContext` delega pro `authService`, que chama `POST /auth/login` na API (mandando o CPF só com os dígitos).
3. A sessão fica persistida com `expo-secure-store` (armazenamento criptografado do dispositivo).
4. `routes/index.routes.tsx` decide automaticamente entre a tela de Login e o app principal, com base no estado de autenticação — não existe navegação manual "pulando" o login.
5. Se a API responder `401` numa requisição com token (sessão expirada ou revogada), o `api.ts` avisa o `AuthContext`, que encerra a sessão e volta pro login com o aviso "Sua sessão expirou".
6. Logout sai na hora no celular e avisa a API (`POST /auth/logout`) pra invalidar o token também no servidor.

### Primeiro acesso e recuperação de senha

O produtor **não se cadastra sozinho**: a empresa cadastra CPF, nome e e-mail (vindos do ERP), sem senha. No app:

1. Na tela de login, o produtor toca em **"Primeiro acesso? Crie sua senha"** ou **"Esqueci minha senha"** e digita o CPF (`pages/solicitarCodigo.tsx`).
2. A API gera um código de 6 números e envia para o **e-mail do cadastro** — nunca para um e-mail digitado no app. A tela mostra para onde foi, escondido em parte (`jo****@gmail.com`).
3. O produtor digita o código e a senha nova (`pages/confirmarCodigo.tsx`). A API confere o código e devolve uma sessão: o `signInWithCode` do `AuthContext` salva e o produtor entra direto.

Regras do código: vale 10 minutos, uso único, 5 tentativas erradas invalidam, novo pedido só depois de 1 minuto (até 5 por hora). Na recuperação, todas as sessões abertas em outros celulares são encerradas. Detalhes no [`contrato-api.md`](contrato-api.md#primeiro-acesso-e-recuperação-de-senha).

## Telas

| Tela | O que mostra |
|---|---|
| **Login** | CPF e senha, com links para "Esqueci minha senha" e "Primeiro acesso" |
| **Primeiro acesso / Esqueci minha senha** | Duas etapas: CPF → código enviado por e-mail + senha nova. Entra direto no final |
| **Dashboard** | Cotação do dia (Arroz/Soja), com data da última atualização |
| **Relatório de Safra** | Total entregue no ano por cultura e as cargas entregues, filtráveis por ano / IE / cultura / período (calendário), carregadas de 30 em 30 conforme a rolagem, com seleção múltipla ("Selecionar todas" marca todas as do filtro) e geração de PDF combinado |
| **Contra-Notas** | Notas fiscais filtráveis por ano / período (calendário), carregadas de 20 em 20 conforme a rolagem, com link direto pro PDF de cada uma e seleção múltipla ("Selecionar todas") para baixar um PDF único com as notas juntas |
| **Perfil** | Dados do produtor (nome, telefone, propriedade — CPF e e-mail só para consulta) e logout |

## API e próxima etapa

O contrato completo de endpoints está documentado em [`contrato-api.md`](contrato-api.md). A API em `server/` é uma implementação de referência — os dados reais de produção devem vir do ERP que a empresa já usa. Qualquer API de produção só precisa **respeitar o mesmo contrato** (rotas, formato de resposta, autenticação) pra o app funcionar sem nenhuma mudança de código — troca-se só o `EXPO_PUBLIC_API_URL`.

## Qualidade de código

- **ESLint** (`npm run lint`) e **Prettier** (`npm run format`) — configurados em `eslint.config.js` e `.prettierrc.json`.
- **Testes automatizados** (`npm test`) com Jest + `jest-expo`. Cobrem a camada de API (requisições, token, erros, sessão expirada, falta de conexão/tempo esgotado), a conversão dos dados da API e as validações/formatações. As telas ainda não têm teste automatizado.
- **Hook de commit** (Husky + lint-staged): antes de cada commit, nos arquivos que vão entrar nele, o ESLint corrige o que der, o Prettier formata e os testes relacionados rodam. Se algum teste falhar, o commit é bloqueado.
  - O hook é instalado sozinho no `npm install` dentro de `Projeto/`, desde que o `.git` esteja na pasta de cima (raiz do repositório).
  - Na primeira vez que um arquivo for commitado, o Prettier pode mudar bastante a formatação dele (aspas, espaços). Pra fazer isso de uma vez só, rode `npm run format` e faça um commit só de formatação.

## O que ainda falta

- **API de produção** ligada ao ERP da empresa, seguindo o [`contrato-api.md`](contrato-api.md) — incluindo os requisitos de segurança da seção 10 (limite de tentativas no login, validação de entrada, armazenamento durável dos PDFs), que a API de referência não implementa
- Renovação automática do token antes de expirar (`POST /auth/refresh` já existe na API; falta o app usar)
- Testes automatizados das telas
- Definir nome final do app (`name`/`slug` no `app.json` ainda são "Projeto") e o ícone/identidade visual definitivos