# Import de transações históricas sem duplicar ajuste de saldo

## Problema

Ao importar um extrato, `ImportForm.tsx` esconde (`visibleTransactions`, linhas 105-111)
qualquer transação com `date` anterior ao último `import_logs.created_at` daquela conta.
Isso significa que qualquer lacuna no histórico (extrato reimportado com período mais
antigo, statement que cobre um intervalo que nunca foi importado antes) nunca chega a
ser mostrada nem importada — as linhas somem silenciosamente.

Como consequência, o saldo da conta nunca bate com a soma das transações reais, e o
usuário é obrigado a usar "Ajustar saldo" (`actions/accounts.ts:101`, `adjustAccountBalance`)
para forçar o saldo a bater, criando uma transação genérica "Ajuste de Saldo" que polui
os gráficos de categoria (aparece como um gasto/receita sem explicação real).

## Objetivo

Permitir importar transações históricas (data anterior ao corte) sem que elas dupliquem
o efeito já absorvido pelo ajuste manual de saldo — e, quando possível, encolher
automaticamente o ajuste genérico conforme dados reais forem preenchidos.

## Escopo

Aplica-se apenas a transações `receita`/`despesa`. Transferências (`transferencia`)
continuam com o comportamento atual, mesmo se datadas antes do corte — caso raro, e
mexer em duas contas + dois possíveis ajustes ao mesmo tempo foge do escopo deste
design.

## Comportamento atual (referência)

- `getLastImportDates()` (`actions/accounts.ts:192`) retorna, por conta, o
  `created_at` do `import_logs` mais recente.
- `ImportForm.tsx` usa esse valor pra filtrar `visibleTransactions`: qualquer linha
  parseada com `date < lastImportDate` nunca aparece na tela de preview.
- `importTransactions` (`actions/import.ts`) não tem noção nenhuma de "corte" — ele só
  recebe o que o client mandou, deduplica por `description+date` (e por
  `amount+date+conta-contraparte` no caso de transferência), e aplica o delta de saldo
  de tudo que sobrar após dedup.
- `adjustAccountBalance` (`actions/accounts.ts:101`) deixa o usuário setar um novo saldo
  manualmente; se `createTransaction=true`, calcula `delta = newBalance - currentBalance`
  e cria uma transação categoria "Ajuste de Saldo" (`ensureAdjustmentCategory`,
  `actions/accounts.ts:164`, privada) com esse valor, depois atualiza `accounts.balance`
  pro novo valor.

## Design

### 1. Detecção do corte, server-side

Em `importTransactions`, antes de processar `transactions`, buscar o `created_at` mais
recente de `import_logs` pra aquele `accountId` (mesma query de `getLastImportDates`,
mas escopada a uma conta e resolvida no server — não confia no valor que o client já
tem). Se não existir nenhum log pra essa conta ainda (primeiro import), não há corte:
tudo é tratado como "atual".

### 2. Preview mostra tudo, marca o que é histórico

`ImportForm.tsx`: `visibleTransactions` deixa de filtrar por data. Passa a computar
`isHistorical` por linha (`t.date < corte`) e repassar isso pro componente de preview.
`hiddenCount` (que hoje mede quantas linhas o corte escondeu) é removido — não sobra
nada escondido por essa razão.

`ImportPreview.tsx`: linhas com `isHistorical=true` ganham uma marcação visual (ex.:
badge "Histórica · não mexe no saldo"). Usuário continua podendo categorizar, excluir
linha de lixo, etc. — mesma interação de hoje, só com essa marcação extra. Dedup
automático (`autoDuplicateKeys`) e manual continuam se aplicando igual, independente de
ser histórica ou não.

### 3. Split no commit e cálculo de saldo

Em `importTransactions`, depois do dedup existente (que não muda), `toImportRegular`
é dividido em:

- `currentRegular`: `date >= corte` (ou corte inexistente)
- `historicalRegular`: `date < corte`

`regularDelta` (usado pra atualizar `accounts.balance`) passa a somar só
`currentRegular` — antes somava `toImportRegular` inteiro. `historicalRegular` entra
no `insert` em `transactions` normalmente (fica gravada, entra em relatórios/gráficos de
categoria), mas não contribui pro delta de saldo. Transferências não mudam.

### 4. Abatimento automático do "Ajuste de Saldo"

Se `historicalRegular.length > 0` (após dedup, ou seja, o que efetivamente foi
inserido):

1. Calcular `historicalNet = soma(amount de receita) - soma(amount de despesa)` desses
   itens.
2. Buscar a transação mais recente da conta cuja categoria tem `name = 'Ajuste de
   Saldo'` (join `transactions` + `categories`, `order by date desc, created_at desc`,
   `limit 1`).
3. Se não encontrar nenhuma: não faz nada além do passo 3 (sem efeito no saldo).
4. Se encontrar:
   - `signed = tipo === 'receita' ? +amount : -amount`
   - `novoSigned = signed - historicalNet`
   - Se `abs(novoSigned) < 0.01`: apagar a transação de ajuste (o gap que ela
     representava foi totalmente explicado por dados reais agora).
   - Senão: fazer `update` na mesma linha com `amount = abs(novoSigned)` e
     `type = novoSigned > 0 ? 'receita' : 'despesa'`, trocando `category_id` pra
     categoria de ajuste do tipo correspondente (mesma regra de
     `ensureAdjustmentCategory` — cria a categoria se não existir).

Nenhuma dessas operações mexe em `accounts.balance` — o saldo já reflete esse gap desde
que o ajuste original foi criado; só a transação de ajuste (e os itens históricos
recém-inseridos) mudam.

### 5. Extração de helper compartilhado

`ensureAdjustmentCategory` (hoje privada em `actions/accounts.ts:164`) move pra
`lib/balance-adjustment.ts` (não é Server Action, função pura de apoio), exportada e
usada tanto por `actions/accounts.ts` quanto por `actions/import.ts`. Evita import
cruzado entre dois arquivos `"use server"`, seguindo o padrão do repo de código
compartilhado ficar em `lib/`.

## Fora de escopo / riscos aceitos

- Transferência histórica não abate ajuste de nenhuma das duas contas — continua
  mexendo saldo normalmente, como hoje.
- Se existir mais de um "Ajuste de Saldo" na conta (usuário ajustou manualmente mais de
  uma vez ao longo do tempo), só o mais recente é abatido. Ajustes mais antigos ficam
  como estão — são ruído histórico no gráfico, mas não afetam o saldo atual.
- Concorrência: mesma limitação que já existe hoje em todo o arquivo (`account.balance`
  lido e escrito sem lock/transação) — não é agravada por este design.

## Arquivos tocados

- `actions/import.ts` — corte, split, abatimento de ajuste
- `app/(app)/import/ImportForm.tsx` — remove filtro de `visibleTransactions`, calcula
  `isHistorical`
- `app/(app)/import/ImportPreview.tsx` — badge de linha histórica
- `actions/accounts.ts` — remove `ensureAdjustmentCategory` local, importa de `lib/`
- `lib/balance-adjustment.ts` (novo) — `ensureAdjustmentCategory` exportada
