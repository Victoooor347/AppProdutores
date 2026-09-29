# Contrato da API — AppProdutores

Este documento descreve **tudo o que o app espera da API**: rotas, parâmetros, formato das respostas, erros e regras de segurança. Qualquer API que siga este contrato funciona com o app sem mudar uma linha de código — basta apontar o `EXPO_PUBLIC_API_URL` para ela.

- **Quem usa:** o app mobile (Expo / React Native) em `Projeto/`.
- **Implementação de referência:** a API em `server/` (Node/Express + Postgres) segue as rotas e formatos deste contrato e serve de exemplo. Ela é só para desenvolvimento: ainda **não** cumpre todos os requisitos da [seção 10](#10-requisitos-de-segurança-e-produção) (limite de tentativas no login, validação completa de entrada, armazenamento durável dos PDFs). A API de produção (ligada ao banco/ERP da empresa) pode ser feita em qualquer linguagem.
- **Última atualização:** 29/09/2026 — ver [Histórico de mudanças](#9-histórico-de-mudanças).

---

## Sumário

1. [Regras gerais](#1-regras-gerais)
2. [Erros e códigos HTTP](#2-erros-e-códigos-http)
3. [Resumo das rotas](#3-resumo-das-rotas)
4. [Autenticação](#4-autenticação) — login, logout, refresh, primeiro acesso e recuperação de senha
5. [Perfil](#5-perfil) — `/me`
6. [Cotação do dia](#6-cotação-do-dia) — `/precos-do-dia`
7. [Cargas e relatório de safra](#7-cargas-e-relatório-de-safra) — `/cargas`, `/relatorios`
8. [Contra-notas](#8-contra-notas) — `/contra-notas`
9. [Histórico de mudanças](#9-histórico-de-mudanças)
10. [Requisitos de segurança e produção](#10-requisitos-de-segurança-e-produção)
11. [Checklist para quem for implementar](#11-checklist-para-quem-for-implementar)

---

## 1. Regras gerais

### Formato

| Item | Regra |
|---|---|
| Protocolo | **HTTPS** em produção (o Android bloqueia `http://` em apps publicados). `http://` só em desenvolvimento. |
| Corpo | JSON (`Content-Type: application/json`), UTF-8. |
| Nomes de campos | `snake_case` (ex: `inscricao_estadual`, `total_items`). |
| Tempo de resposta | O app desiste depois de **10 segundos** e mostra "Tempo de conexão esgotado". |

### Autenticação

Todas as rotas, **exceto `POST /auth/login`**, exigem o token no cabeçalho:

```
Authorization: Bearer <token>
```

O usuário (produtor) é sempre identificado **pelo token**. Nenhuma rota recebe CPF ou ID de usuário no corpo ou na URL — a API nunca deve confiar nisso vindo do cliente.

### Tipos de dados

| Tipo | Formato | Exemplo |
|---|---|---|
| CPF | Texto com **só os 11 dígitos**, sem máscara. O app formata para exibir. | `"52998224725"` |
| Número (preço, quantidade, total) | **Número JSON**, nunca texto. | `63.2`, `500` — e não `"63.20"` |
| Data (sem hora) | `"AAAA-MM-DD"`. O app exibe exatamente esse dia, sem converter fuso. | `"2026-07-20"` |
| Data e hora | ISO 8601 **com fuso** (`Z` ou `-03:00`). O app converte pro horário do celular. | `"2026-07-20T14:30:00-03:00"` |
| ID | Texto, único. O formato é livre (UUID, número, código do ERP...). | `"3f2b9c1e-..."` ou `"12345"` |
| Cultura / commodity | Texto em minúsculas: `"arroz"` ou `"soja"`. | `"arroz"` |

> **Sobre datas sem hora:** o app pega a parte antes do `T`, se houver (`"2026-07-20T03:00:00Z"` aparece como 20/07/2026). Por isso, mandar data+hora em UTC para um campo que é "só dia" pode mostrar o dia errado. Prefira sempre `"AAAA-MM-DD"` nesses campos.

> **Sobre culturas novas:** a Cotação do dia aceita qualquer commodity que vier na lista. Já o Relatório de Safra tem os cards e o filtro fixos para arroz e soja — incluir outra cultura exige atualizar o app.

### Paginação

Rotas de lista aceitam:

| Parâmetro | Tipo | Padrão | Regra |
|---|---|---|---|
| `page` | número | `1` | Começa em 1. |
| `per_page` | número | `20` | Itens por página. Recomendado aceitar de 1 a 100. |

E respondem com a lista em `data` + um objeto `pagination`:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total_items": 73,
    "total_pages": 3
  }
}
```

- `total_pages` é **no mínimo 1**, mesmo sem itens.
- A ordenação precisa ser **estável** (sempre com um desempate, como o `id`). Sem isso, itens com o mesmo valor de ordenação podem trocar de lugar entre uma página e outra, e o app acaba mostrando um item repetido ou pulando outro.
- **`per_page=100` precisa funcionar.** O botão "Selecionar todas" (Relatório de Safra e Contra-Notas) marca tudo o que o filtro encontrou, inclusive o que ainda não apareceu na tela: para isso o app percorre todas as páginas com `per_page=100`, com os mesmos filtros da tela.

---

## 2. Erros e códigos HTTP

Toda resposta de erro (status fora da faixa 2xx) tem este corpo:

```json
{ "message": "Texto em português, pronto para mostrar ao produtor." }
```

**O app mostra o `message` direto para o usuário**, então ele deve ser claro e nunca conter detalhes técnicos (stack trace, SQL, nome de tabela). Se o corpo não for JSON, o app mostra "Não foi possível completar a requisição."

| Status | Quando usar | O que o app faz |
|---|---|---|
| `200` | Sucesso. | Segue normalmente. |
| `400` | Dados inválidos (campo faltando, formato errado). | Mostra o `message`. |
| `401` | Token ausente, inválido, **expirado ou revogado**. Também no login com CPF/senha errados. | Numa rota autenticada: **encerra a sessão e volta pro login** ("Sua sessão expirou"). No login: só mostra o `message`. |
| `403` | Usuário autenticado, mas sem permissão para aquele recurso (ex: carga de outro produtor). | Mostra o `message`. **Não** desloga. |
| `404` | Recurso não encontrado. | Mostra o `message`. |
| `409` | Conflito com o estado atual (ex: primeiro acesso de quem já tem senha). | Mostra o `message`. |
| `422` | Cadastro incompleto para a operação (ex: produtor sem e-mail cadastrado). | Mostra o `message`. |
| `429` | Muitas tentativas (limite de requisições). | Mostra o `message`. |
| `5xx` | Erro interno. | Mostra o `message` — use algo genérico como "Erro interno no servidor." Exceção: `503` quando o e-mail não pôde ser enviado, com mensagem amigável ("Tente novamente em alguns minutos"). |

> ⚠️ **Importante:** use `401` **somente** para problema de token/login. Se a API devolver `401` para "sem permissão", o app vai deslogar o produtor sem motivo — para isso existe o `403`.

---

## 3. Resumo das rotas

| Método | Rota | Autenticação | Usada na tela |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login |
| `POST` | `/auth/logout` | ✅ | Perfil (botão Sair) |
| `POST` | `/auth/refresh` | ✅ | *(prevista — o app ainda não usa)* |
| `POST` | `/auth/primeiro-acesso/solicitar-codigo` | — | Primeiro acesso |
| `POST` | `/auth/primeiro-acesso/confirmar` | — | Primeiro acesso |
| `POST` | `/auth/recuperar-senha/solicitar-codigo` | — | Esqueci minha senha |
| `POST` | `/auth/recuperar-senha/confirmar` | — | Esqueci minha senha |
| `GET` | `/me` | ✅ | Perfil |
| `PUT` | `/me` | ✅ | Perfil |
| `GET` | `/precos-do-dia` | ✅ | Início (Dashboard) |
| `GET` | `/cargas/resumo` | ✅ | Relatório de Safra |
| `GET` | `/cargas` | ✅ | Relatório de Safra |
| `POST` | `/relatorios/gerar-pdf` | ✅ | Relatório de Safra |
| `GET` | `/relatorios/gerar-pdf/{job_id}` | ✅ | Relatório de Safra |
| `GET` | `/contra-notas` | ✅ | Contra-Notas |
| `POST` | `/contra-notas/gerar-pdf` | ✅ | Contra-Notas |
| `GET` | `/contra-notas/gerar-pdf/{job_id}` | ✅ | Contra-Notas |

---

## 4. Autenticação

### `POST /auth/login`

Entra com CPF e senha. **Não** exige token.

**Corpo:**

```json
{ "cpf": "52998224725", "password": "123456" }
```

- `cpf`: só os 11 dígitos (o app remove a máscara antes de enviar).
- Antes de chamar a API, o app já valida os dígitos verificadores do CPF e exige senha com **no mínimo 6 caracteres** — senhas cadastradas precisam respeitar esse mínimo.

**Resposta `200`:**

```json
{
  "user": { "cpf": "52998224725", "name": "Produtor de Teste" },
  "token": "c1a5...e9",
  "expires_in": 86400
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `user.cpf` | ✅ | CPF do produtor (11 dígitos). |
| `user.name` | — | Nome do produtor. |
| `token` | ✅ | Token de acesso, mandado depois em `Authorization: Bearer`. |
| `expires_in` | ✅ | Validade do token em **segundos** (a referência usa 24h = `86400`). O app ainda não usa, mas vai usar para renovar o token antes de expirar. |

**Erros:**

| Status | `message` (exemplo) | Quando |
|---|---|---|
| `400` | `CPF e senha são obrigatórios.` | Campo faltando. |
| `401` | `CPF ou senha incorretos.` | CPF não existe **ou** senha errada — **a mesma mensagem nos dois casos**, para não revelar quais CPFs estão cadastrados. |
| `401` | `Você ainda não criou sua senha. Toque em "Primeiro acesso" para criar.` | Produtor cadastrado pela empresa que ainda não fez o [primeiro acesso](#primeiro-acesso-e-recuperação-de-senha). |
| `429` | `Muitas tentativas. Tente novamente em alguns minutos.` | Limite de tentativas atingido (ver [seção 10](#10-requisitos-de-segurança-e-produção)). |

### `POST /auth/logout`

Encerra a sessão: o token deixa de valer **no servidor**.

**Corpo:** `{}` (vazio)

**Resposta `200`:**

```json
{ "message": "Sessão encerrada com sucesso." }
```

**Como o app usa:** primeiro apaga a sessão do celular (o produtor sai na hora, mesmo sem internet) e depois chama esta rota. Se a chamada falhar, o app ignora. Se a API usar tokens que não podem ser revogados (ex: JWT sem lista de bloqueio), ela pode responder `200` mesmo assim — o importante é não quebrar.

### `POST /auth/refresh` *(prevista)*

Troca um token ainda válido por um novo, sem pedir a senha de novo. **O app ainda não usa esta rota** — está no contrato porque é o próximo passo planejado (renovar a sessão automaticamente antes de expirar).

**Corpo:** `{}` (vazio) — o token atual vai no cabeçalho.

**Resposta `200`:**

```json
{ "token": "novo-token...", "expires_in": 86400 }
```

O token antigo deve deixar de valer (rotação de token).

### Primeiro acesso e recuperação de senha

Os dois fluxos funcionam do mesmo jeito, em duas etapas, com um código enviado por e-mail. **Nenhuma das rotas exige token.**

1. **Solicitar código:** o produtor informa só o CPF. A API gera um código e envia para o **e-mail que a empresa tem no cadastro**.
2. **Confirmar:** o produtor informa CPF, código e a senha nova. A API grava a senha e já devolve uma sessão (o produtor entra direto no app).

| Fluxo | Para quem | Rotas |
|---|---|---|
| **Primeiro acesso** | Produtor cadastrado pela empresa que **ainda não tem senha** (`password_hash` vazio). | `/auth/primeiro-acesso/...` |
| **Esqueci minha senha** | Qualquer produtor cadastrado com e-mail. Ao confirmar, **todas as sessões abertas são encerradas**. | `/auth/recuperar-senha/...` |

> 🔒 **Regra de segurança principal:** o e-mail vem **sempre do cadastro da empresa** (ERP), nunca do app. O produtor não informa nem altera o e-mail pelo app. É isso que impede alguém de criar ou trocar a senha da conta de outra pessoa só sabendo o CPF dela.

**Regras do código** (a API de produção deve seguir as mesmas):

| Regra | Valor |
|---|---|
| Formato | 6 números (`"000000"` a `"999999"`), gerados com gerador **criptográfico** (nunca `Math.random`). |
| Armazenamento | Só o **hash** do código (ex: bcrypt), nunca o código puro. O código também não deve aparecer em log. |
| Validade | 10 minutos. |
| Uso | Uma vez só. Pedir um código novo invalida os anteriores (só o mais recente vale). |
| Tentativas | 5 códigos errados invalidam o código — o produtor precisa pedir outro. |
| Reenvio | Mínimo de 60 segundos entre pedidos, e no máximo 5 pedidos por hora para o mesmo CPF e fluxo → `429`. |

#### `POST /auth/primeiro-acesso/solicitar-codigo` e `POST /auth/recuperar-senha/solicitar-codigo`

Mesma entrada e saída nas duas rotas.

**Corpo:**

```json
{ "cpf": "52998224725" }
```

**Resposta `200`:**

```json
{
  "email_mascarado": "pr****@exemplo.com",
  "expira_em_segundos": 600,
  "reenviar_em_segundos": 60
}
```

| Campo | Descrição |
|---|---|
| `email_mascarado` | Para onde o código foi, escondido em parte: as 2 primeiras letras + `****` + o domínio completo. O app mostra esse texto ao produtor. |
| `expira_em_segundos` | Validade do código. O app mostra "vale por 10 minutos". |
| `reenviar_em_segundos` | Quanto esperar para pedir outro código. O app faz uma contagem regressiva no botão "Reenviar código". |

**Erros:**

| Status | `message` (exemplo) | Quando |
|---|---|---|
| `400` | `Informe um CPF válido.` | CPF sem 11 dígitos. |
| `404` | `CPF não encontrado. Fale com a Dickow para fazer seu cadastro.` | CPF não cadastrado pela empresa. |
| `409` | `Este CPF já tem senha. Se não lembrar dela, use "Esqueci minha senha".` | **Só no primeiro acesso:** o produtor já criou a senha antes. |
| `422` | `Não há e-mail cadastrado para este CPF. Fale com a Dickow para atualizar seu cadastro.` | Produtor sem e-mail no cadastro. |
| `429` | `Aguarde 42 segundos para pedir um novo código.` | Pedido antes de 60 segundos do anterior. |
| `429` | `Você pediu muitos códigos. Tente de novo daqui a 1 hora.` | Mais de 5 pedidos na mesma hora. |
| `503` | `Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.` | Falha no envio do e-mail. O código gerado deve ser descartado (não conta como pedido). |

> Mostrar o e-mail mascarado revela que aquele CPF tem cadastro — foi uma decisão consciente, porque ajuda o produtor a saber em qual e-mail procurar o código. Por isso o limite de pedidos é importante.

#### `POST /auth/primeiro-acesso/confirmar` e `POST /auth/recuperar-senha/confirmar`

**Corpo:**

```json
{ "cpf": "52998224725", "codigo": "048213", "password": "novaSenha1" }
```

- `codigo`: exatamente 6 números, como texto (pode começar com zero).
- `password`: no mínimo 6 caracteres (mesma regra do login).

**Resposta `200`:** igual à do [`POST /auth/login`](#post-authlogin) — `user`, `token` e `expires_in`. O app salva a sessão e entra direto.

No `recuperar-senha/confirmar`, antes de criar a sessão nova, **todas as sessões abertas do produtor são encerradas** (quem estava usando a conta com a senha antiga perde o acesso).

**Erros:**

| Status | `message` (exemplo) | Quando |
|---|---|---|
| `400` | `Digite o código de 6 números que chegou no seu e-mail.` | Código fora do formato. |
| `400` | `A senha deve ter pelo menos 6 caracteres.` | Senha curta. Não conta como tentativa de código. |
| `400` | `Código incorreto. Você ainda tem 3 tentativas.` | Código errado (conta tentativa). |
| `400` | `Código incorreto. Peça um novo código.` | 5º código errado. |
| `400` | `Muitas tentativas com código errado. Peça um novo código.` | Código já bloqueado por erros. |
| `400` | `Este código expirou. Peça um novo código.` | Passou dos 10 minutos. |
| `400` | `Não há código válido para este CPF. Peça um novo código.` | Nenhum código pedido, ou o último já foi usado. |
| `404` / `422` | (iguais aos da etapa anterior) | CPF não cadastrado / sem e-mail. |
| `409` | `Este CPF já tem senha...` | **Só no primeiro acesso:** a senha já foi criada. |

**O e-mail enviado** deve ter o código em destaque, dizer para que ele serve (criar ou redefinir a senha), a validade, e orientar a ignorar a mensagem se não foi o produtor que pediu. A referência em `server/src/services/codigoService.js` tem um modelo em texto e HTML.

---

## 5. Perfil

### `GET /me`

Dados do produtor logado.

**Resposta `200`:**

```json
{
  "cpf": "52998224725",
  "name": "Produtor de Teste",
  "email": "produtor.teste@exemplo.com",
  "telefone": "51999990000",
  "propriedade": "Fazenda Exemplo"
}
```

| Campo | Pode ser `null`? | Descrição |
|---|---|---|
| `cpf` | não | 11 dígitos. O app mostra formatado (000.000.000-00) e **não deixa editar**. |
| `name` | não | Nome do produtor. |
| `email` | sim | E-mail do cadastro da empresa, para onde vão os códigos de acesso. O app mostra, mas **não deixa editar**. `null` aparece como "Não cadastrado". |
| `telefone` | sim | Texto livre, do jeito que o produtor digitou. `null` aparece como campo vazio. |
| `propriedade` | sim | Nome da fazenda/propriedade. `null` aparece como campo vazio. |

### `PUT /me`

Atualiza os dados do produtor logado. **O CPF nunca é editável** — ele vem do token, não do corpo. **O e-mail também não**: ele é o canal de recuperação de senha, então só muda pelo cadastro da empresa (se o app pudesse trocar, quem pegasse o celular desbloqueado poderia trocar o e-mail e depois a senha).

**Corpo** (o app sempre manda os três campos):

```json
{ "name": "Produtor de Teste", "telefone": "51999990000", "propriedade": "Fazenda Exemplo" }
```

- `name`: obrigatório, não pode ser vazio (o app já valida, mas a API deve validar também → `400`).
- `telefone` e `propriedade`: podem vir como texto vazio `""`.

**Resposta `200`:** o perfil atualizado, no mesmo formato do `GET /me`.

---

## 6. Cotação do dia

### `GET /precos-do-dia`

Preços do dia exibidos na tela inicial. Não existe tela de administração no app — os preços são atualizados direto na fonte de dados.

**Resposta `200`:**

```json
{
  "data": [
    {
      "commodity": "arroz",
      "nome_exibicao": "Arroz",
      "preco": 63.2,
      "unidade": "sc",
      "descricao": "62 x 8 de Grão inteiro, Tipo 1",
      "atualizado_em": "2026-09-29T08:00:00-03:00"
    },
    {
      "commodity": "soja",
      "nome_exibicao": "Soja",
      "preco": 123.5,
      "unidade": "sc",
      "atualizado_em": "2026-09-29T08:00:00-03:00"
    }
  ]
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `commodity` | ✅ | Identificador (`"arroz"`, `"soja"`...). Precisa ser único na lista. |
| `nome_exibicao` | ✅ | Nome mostrado na tela. |
| `preco` | ✅ | Preço bruto em reais, como número. O app formata como `R$ 63,20`. |
| `unidade` | ✅ | Unidade do preço (ex: `"sc"`). |
| `descricao` | — | Observação sobre o produto (ex: classificação). Pode ser omitida ou `null`. |
| `atualizado_em` | ✅ | Data e hora da última atualização, **com fuso**. O app mostra a mais recente da lista como "Última atualização". |

- Os itens aparecem **na ordem em que vierem** na lista.
- Lista vazia → o app mostra "Nenhum preço disponível no momento".

---

## 7. Cargas e relatório de safra

### `GET /cargas/resumo`

Resumo do ano: total entregue por cultura e as inscrições estaduais (IEs) com entregas no ano.

**Parâmetros:**

| Parâmetro | Obrigatório | Descrição |
|---|---|---|
| `ano` | — | Ano com 4 dígitos. Se não vier, usa o ano atual. |

**Resposta `200`:**

```json
{
  "data": [
    { "cultura": "arroz", "total_sacas": 2175, "unidade": "sc" },
    { "cultura": "soja",  "total_sacas": 800,  "unidade": "sc" }
  ],
  "inscricoes_estaduais": ["123456789", "987654321"]
}
```

| Campo | Descrição |
|---|---|
| `data` | Um item por cultura **com entregas no ano**. Cultura sem entrega pode ser omitida — o app mostra 0. |
| `data[].total_sacas` | Soma das quantidades do ano, como número. |
| `inscricoes_estaduais` | IEs do produtor **com pelo menos uma carga no ano**, sem repetição, em ordem crescente. Viram as opções do filtro "IE" da tela. |

### `GET /cargas`

Lista de cargas entregues, com filtros e paginação. O app carrega 30 por vez e busca a próxima página quando o produtor rola até o fim da lista.

**Parâmetros** (todos opcionais; os filtros se somam — "E", não "OU"):

| Parâmetro | Descrição |
|---|---|
| `page`, `per_page` | Paginação ([seção 1](#paginação)). O app usa `per_page=30`. |
| `ano` | Só cargas desse ano. |
| `inscricao_estadual` | Só cargas dessa IE. |
| `cultura` | `"arroz"` ou `"soja"`. |
| `data_inicio` | `AAAA-MM-DD`. Cargas **a partir** desse dia (inclusive). |
| `data_fim` | `AAAA-MM-DD`. Cargas **até** esse dia (inclusive). |

**Ordenação:** da mais recente para a mais antiga (`data` decrescente), com desempate estável (ex: `id`).

**Resposta `200`:**

```json
{
  "data": [
    {
      "id": "3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d22",
      "cultura": "arroz",
      "data": "2026-07-25",
      "inscricao_estadual": "123456789",
      "quantidade": 300,
      "unidade": "sc",
      "placa": "JKL4F56"
    }
  ],
  "pagination": { "page": 1, "per_page": 30, "total_items": 73, "total_pages": 3 }
}
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único da carga. É o que o app manda para gerar o PDF. |
| `cultura` | `"arroz"` ou `"soja"`. |
| `data` | Dia da entrega, `AAAA-MM-DD`. |
| `inscricao_estadual` | IE da entrega. |
| `quantidade` | Número. |
| `unidade` | Ex: `"sc"`. |
| `placa` | Placa do caminhão. |

O app mostra também o total de cargas encontradas (`pagination.total_items`).

### `POST /relatorios/gerar-pdf`

Gera um PDF com as cargas que o produtor selecionou.

**Corpo:**

```json
{ "carga_ids": ["3f2b9c1e-...", "7a1d0e44-..."] }
```

- Pelo menos 1 ID, sem repetição (o app nunca manda repetido).
- **Todas** as cargas precisam ser do produtor logado.

**Resposta `200`:**

```json
{ "job_id": "b8e1...", "status": "processando" }
```

| Campo | Descrição |
|---|---|
| `job_id` | Identificador da geração, usado na consulta abaixo. |
| `status` | `"processando"`, `"pronto"` ou `"erro"`. |
| `arquivo_pdf_url` | Link do PDF — obrigatório quando `status` é `"pronto"`. |

> **Geração na hora também funciona:** se a API conseguir gerar o PDF durante a própria requisição, pode responder direto com `"status": "pronto"` e o `arquivo_pdf_url`. O app abre o PDF sem fazer consultas.

**Erros:**

| Status | `message` (exemplo) | Quando |
|---|---|---|
| `400` | `Selecione ao menos uma carga.` | Lista vazia, faltando ou com ID em formato inválido. |
| `403` | `Uma ou mais cargas não pertencem a este usuário.` | Alguma carga é de outro produtor (ou não existe). |

### `GET /relatorios/gerar-pdf/{job_id}`

Consulta o andamento da geração.

**Resposta `200`:**

```json
{
  "job_id": "b8e1...",
  "status": "pronto",
  "arquivo_pdf_url": "https://arquivos.exemplo.com.br/relatorios/b8e1....pdf"
}
```

- Enquanto `status` for `"processando"`, o app consulta de novo a cada **1,5 segundo**, por até **~30 segundos**. Depois disso, avisa o produtor para tentar mais tarde.
- Job de outro produtor ou inexistente → `404`.

### Sobre os links de PDF (vale também para as contra-notas)

O app abre o `arquivo_pdf_url` direto no navegador/leitor de PDF do celular. **Nessa hora não dá para mandar o token**, então o link precisa:

- abrir **sem login** — público, mas impossível de adivinhar (ex: com UUID), ou assinado com validade (ex: URL pré-assinada do S3/Azure);
- usar **HTTPS**;
- continuar funcionando por pelo menos alguns minutos depois de gerado (no caso das contra-notas, o link é mostrado na lista e o produtor pode tocar nele bem depois).

O conteúdo do PDF não faz parte do contrato. A referência em `server/` gera uma tabela (Data, Cultura, Quantidade, IE, Placa) com os totais por cultura.

---

## 8. Contra-notas

### `GET /contra-notas`

Notas fiscais (contra-notas) do produtor, com link do PDF de cada uma.

**Parâmetros** (todos opcionais; os filtros se somam — "E", não "OU"):

| Parâmetro | Descrição |
|---|---|
| `page`, `per_page` | Paginação ([seção 1](#paginação)). O app carrega 20 por vez (`per_page=20`) e busca a próxima página quando o produtor rola até o fim da lista. |
| `ano` | Só notas emitidas nesse ano. O app sempre manda (começa no ano atual). |
| `data_inicio` | `AAAA-MM-DD`. Notas emitidas **a partir** desse dia (inclusive). |
| `data_fim` | `AAAA-MM-DD`. Notas emitidas **até** esse dia (inclusive). |

Os filtros de data comparam o **mesmo dia que o app mostra** na tela — o dia que está escrito em `data_emissao`. Se a API guarda data e hora, deve filtrar pelo dia correspondente, sem converter fuso (a referência compara o dia em UTC, porque devolve a data em UTC).

**Ordenação:** da mais recente para a mais antiga (`data_emissao` decrescente), com desempate estável.

**Resposta `200`:**

```json
{
  "data": [
    {
      "id": "c0ffee00-...",
      "numero": "000125",
      "data_emissao": "2026-07-22",
      "arquivo_pdf_url": "https://arquivos.exemplo.com.br/contra-notas/000125.pdf"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_items": 3, "total_pages": 1 }
}
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único. |
| `numero` | Número da NF, como texto (preserva zeros à esquerda). O app mostra "NF - 000125". |
| `data_emissao` | Dia da emissão. Prefira `AAAA-MM-DD` (ver [tipos de dados](#tipos-de-dados)). |
| `arquivo_pdf_url` | Link do PDF da nota — ver [links de PDF](#sobre-os-links-de-pdf-vale-também-para-as-contra-notas). |

### `POST /contra-notas/gerar-pdf`

Junta os PDFs das contra-notas selecionadas **em um arquivo só** (as notas em ordem de emissão, da mais antiga para a mais recente). Funciona igual ao [`POST /relatorios/gerar-pdf`](#post-relatoriosgerar-pdf): responde com um job e o app consulta até ficar pronto.

**Corpo:**

```json
{ "contra_nota_ids": ["c0ffee00-...", "c0ffee01-..."] }
```

- De 1 a **200** IDs, sem repetição. O app nunca manda repetido; com "Selecionar todas", pode mandar todas as notas do filtro.
- **Todas** as notas precisam ser do produtor logado.

**Resposta `200`:** igual à do relatório de cargas — `job_id`, `status` (`"processando"`, `"pronto"` ou `"erro"`) e `arquivo_pdf_url` quando pronto. Se a API conseguir juntar na hora, pode responder direto com `"status": "pronto"`.

**Erros:**

| Status | `message` (exemplo) | Quando |
|---|---|---|
| `400` | `Selecione ao menos uma contra-nota.` | Lista vazia ou faltando. |
| `400` | `Selecione no máximo 200 contra-notas por PDF.` | Mais de 200 IDs. |
| `400` | `Contra-nota inválida na seleção.` | ID em formato inválido. |
| `403` | `Uma ou mais contra-notas não pertencem a este usuário.` | Alguma nota é de outro produtor (ou não existe). |

Se o PDF de alguma nota não puder ser obtido (ex: arquivo não encontrado no ERP), o job termina com `"status": "erro"` — o app avisa o produtor para tentar de novo.

### `GET /contra-notas/gerar-pdf/{job_id}`

Consulta o andamento, igual ao [`GET /relatorios/gerar-pdf/{job_id}`](#get-relatoriosgerar-pdfjob_id). Job de outro produtor, inexistente ou com ID inválido → `404`.

---

## 9. Histórico de mudanças

| Data | Mudança |
|---|---|
| 29/09/2026 | Documento reescrito a partir do código do app. |
| 29/09/2026 | `GET /cargas/resumo` passa a devolver `inscricoes_estaduais` (o app não baixa mais a lista inteira de cargas só para montar o filtro de IE). |
| 29/09/2026 | `POST /auth/login`: o app passa a mandar o CPF **só com dígitos**. |
| 29/09/2026 | Listas passam a exigir ordenação estável (com desempate), por causa da rolagem infinita. |
| 29/09/2026 | Regra de `401` × `403` explicitada: `401` agora faz o app deslogar. |
| 29/09/2026 | Contra-notas: o app passa a carregar em páginas de 20 (antes pedia 50 e mostrava só a primeira página). |
| 29/09/2026 | **Primeiro acesso e recuperação de senha** por código no e-mail: 4 rotas novas em `/auth/primeiro-acesso/...` e `/auth/recuperar-senha/...`. Produtor pode existir sem senha (cadastrado pela empresa). `GET /me` passa a devolver `email`. Login devolve mensagem própria para quem ainda não criou a senha. |
| 29/09/2026 | **Contra-notas:** filtros `ano`, `data_inicio` e `data_fim`; rotas novas `POST /contra-notas/gerar-pdf` e `GET /contra-notas/gerar-pdf/{job_id}` (PDF único com as notas selecionadas). **"Selecionar todas"** no Relatório de Safra e nas Contra-Notas: o app percorre as páginas com `per_page=100`. |

---

## 10. Requisitos de segurança e produção

Não mudam o formato das respostas, mas a API de produção **precisa** atender:

**Dados e acesso**
- Toda consulta é filtrada pelo produtor do token. Um produtor nunca pode ver ou usar dados de outro — mesmo mandando o ID certo (→ `403`/`404`).
- Senhas guardadas só como hash forte (bcrypt ou argon2). Nunca em texto puro, nunca em log.
- Tokens longos e aleatórios (ou JWT assinado), com expiração. Se forem guardados no banco, guardar só o hash.

**Proteção**
- **Limite de tentativas no login** (ex: 5 erros por CPF/IP em 15 minutos → `429`), contra força bruta.
- **Códigos por e-mail** seguindo as [regras do código](#primeiro-acesso-e-recuperação-de-senha) (hash, validade, uso único, 5 tentativas, limite de reenvio). Vale também limitar os pedidos de código **por IP**, para ninguém testar vários CPFs em sequência.

**E-mail**
- Enviar por um provedor confiável (servidor da empresa, SendGrid, Amazon SES...), com o domínio configurado com **SPF, DKIM e DMARC** — sem isso, os códigos tendem a cair no spam.
- Remetente que não aceita resposta (ex: `nao-responda@dominio`), e o código **nunca** registrado em log.
- **Validação de entrada em todas as rotas:** `page ≥ 1`, `per_page` entre 1 e 100, datas válidas, IDs no formato certo. Entrada inválida → `400`, nunca `500`.
- Erros `5xx` sem detalhes internos na resposta. O detalhe vai só para o log do servidor.

**Infraestrutura**
- HTTPS com certificado válido. Conexão com o banco também criptografada e com certificado validado.
- PDFs guardados em armazenamento durável (bucket S3/Azure/GCS, ou servidos direto pelo ERP), não no disco do servidor — o disco pode ser apagado a cada deploy.
- Links de PDF gerados com o endereço público e HTTPS da API. Atrás de proxy/load balancer, cuidado para não gerar `http://` ou o endereço interno.
- CORS não é necessário para o app mobile (só se um dia existir versão web).

---

## 11. Checklist para quem for implementar

- [ ] Todas as rotas da [seção 3](#3-resumo-das-rotas) existem, com os mesmos caminhos e métodos.
- [ ] Nomes de campo em `snake_case`, exatamente como nos exemplos.
- [ ] Números como número JSON; datas sem hora como `AAAA-MM-DD`; datas com hora com fuso.
- [ ] CPF sempre com 11 dígitos, sem máscara.
- [ ] Erros sempre como `{ "message": "..." }`, em português.
- [ ] `401` só para token/login; `403` para "sem permissão".
- [ ] Listas com `data` + `pagination` e ordenação estável.
- [ ] `/cargas/resumo` devolve `inscricoes_estaduais`.
- [ ] `/contra-notas` aceita os filtros `ano`, `data_inicio` e `data_fim`, e `per_page=100` funciona em todas as listas.
- [ ] `POST /contra-notas/gerar-pdf` junta os PDFs das notas (até 200) num arquivo só, com o job consultável em `GET /contra-notas/gerar-pdf/{job_id}`.
- [ ] Links de PDF abrem sem login, em HTTPS.
- [ ] Primeiro acesso e recuperação de senha com as regras do código (6 números, hash, 10 min, uso único, 5 tentativas, reenvio após 60 s e até 5 por hora), e-mail **sempre** do cadastro da empresa.
- [ ] Produtores importados do ERP **sem senha** e **com e-mail**; `GET /me` devolve o `email`.
- [ ] Limite de tentativas no login, validação de entrada e HTTPS ([seção 10](#10-requisitos-de-segurança-e-produção)).
- [ ] Teste rápido: rodar o app com `EXPO_PUBLIC_API_URL` apontando para a nova API e passar por todas as telas.
