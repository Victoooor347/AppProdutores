# AppProdutores

App mobile (Expo / React Native) de acesso exclusivo para produtores, com telas de Dashboard, Relatórios, Contra-Notas e gestão de usuário.

> ⚠️ Projeto em desenvolvimento. Várias telas ainda são placeholders de exemplo, e a API de backend ainda não existe — o login funciona hoje com um mock local (veja abaixo).

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

O fluxo de login está descrito em detalhe em [`docs/autenticacao.md`](./docs/autenticacao.md) *(ou peça o resumo gerado durante o desenvolvimento)*. Resumo rápido:

1. `src/pages/login` valida o formulário (`src/utils/validators.ts`) e chama `signIn` do `AuthContext`.
2. `AuthContext` (`src/context/authContext.tsx`) delega para `authService`, que usa a API real se `EXPO_PUBLIC_API_URL` estiver configurada, ou o mock local caso contrário.
3. A sessão é persistida com `expo-secure-store` (armazenamento criptografado do dispositivo).
4. `src/routes/index.routes.tsx` decide automaticamente entre a tela de Login e o app principal, com base no estado de autenticação — não existe navegação manual "pulando" o login.

## Status do projeto / próximos passos

- [x] Autenticação com persistência segura de sessão
- [x] Rotas protegidas por estado de autenticação real
- [x] Camada de API preparada para o backend (ainda não existente)
- [x] Validação de CPF e senha no formulário de login
- [ ] ESLint + Prettier + Husky (lint configurado; hook de pre-commit pendente)
- [ ] Telas de Dashboard, Relatórios, Contra-Notas e Usuários (hoje são placeholders)
- [ ] Testes automatizados