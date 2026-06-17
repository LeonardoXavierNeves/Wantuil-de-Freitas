# Changelog v2.6 — Modelo de Lotes

## Mudanca arquitetural: cada entrada agora cria um LOTE

### Conceito

**Antes:** cada item tinha uma unica `dataValidade` e um `saldoAtual`. Se chegassem
20 pacotes de arroz com validades diferentes, a informacao se perdia — ficava tudo
sob uma unica validade.

**Agora:** cada item e o cadastro mestre (nome, EAN, categoria). Quando entra uma
doacao, e criado um **LOTE** com sua propria quantidade, validade, doador e
data de entrada. O `saldoAtual` do item passa a ser a **soma dos lotes ativos**.

### Como funciona na pratica

1. **Entrada** — cada produto vira um lote:
   - Doacao com 5 pacotes mesma validade → 1 lote com qtd 5
   - Doacao com 2 validades diferentes → 2 lotes
   - O sistema gera um **codigo unico** por lote: `L-AAAAMMDD-NNNN`

2. **Etiquetas** — uma etiqueta por unidade fisica, todas com **o mesmo codigo de lote**:
   - 5 pacotes do mesmo lote → 5 etiquetas iguais
   - Barcode (Code128) impresso e o codigo do lote, NAO o EAN
   - Cada etiqueta mostra: nome do produto, entrada, validade, codigo do lote

3. **Saida** — scanner le o codigo do lote:
   - Funcionario le qualquer etiqueta do lote
   - Sistema localiza o lote, mostra disponivel
   - Usuario informa quantas unidades sairao
   - Saida abate **daquele lote especifico** (sem FEFO automatico)

4. **Validade** — calculada por LOTE, nao por item:
   - Cada lote tem seu proprio status
   - Um item pode ter um lote "vigente" e outro "para descarte"
   - Descarte e feito por lote (codigo + motivo)

## O que mudou

### Backend
- Novo modelo `Lote` no schema (codigoLote, itemId, quantidadeInicial, quantidadeAtual, dataEntrada, dataValidade, doadorId, setorId, localizacao, observacao, ativo)
- Novo modulo `LotesModule` (service + controller) com endpoints:
  - `GET /lotes` — lista com filtros
  - `GET /lotes/codigo/:codigo` — usado pelo scanner na tela de saidas
  - `GET /lotes/alertas` — lotes proximos do vencimento, em descarte etc
  - `PATCH /lotes/:id` — atualizar validade, localizacao, observacao
- `MovimentacoesService` totalmente reescrito:
  - Entrada cria 1+ lotes (cada linha do form vira um lote)
  - Saida abate de lotes especificos (via codigoLote lido na etiqueta)
  - Descarte recebe `loteId` em vez de `itemId`
  - Estorno desfaz as operacoes nos lotes corretos
- `MovimentacaoItem` ganhou campo `loteId` para rastreabilidade
- `ItensService.alertas()` agora retorna lotes com problema de validade + itens abaixo do minimo
- `NotificacoesService.verificarItens()` itera lotes para validade e itens para minimo
- `EtiquetasService` reescrito: barcode e o **codigoLote** em vez do EAN. URL: `GET /etiquetas/lote/:loteId?qtd=N`
- Novo modulo `SistemaModule` com endpoint admin `POST /sistema/reset-para-lotes`

### Frontend
- Novo componente `ScannerLote.tsx` — le etiqueta de lote (input + camera) e mostra info do lote encontrado
- `Entradas.tsx` reescrita — cada linha cria um lote; apos salvar, mostra botoes "Imprimir N etiquetas" para cada lote criado
- `Saidas.tsx` reescrita — botao "Escanear etiqueta" abre o scanner; lotes lidos viram linhas com quantidade ajustavel
- `Validade.tsx` reescrita — lista lotes (codigo + item + saldo + validade) e permite descarte de lote especifico
- `Itens.tsx` — coluna "Validade/Status" virou "Lotes" com botao "Ver lotes" que abre modal com a lista de lotes daquele item
- `Dashboard.tsx` — alertas exibem nome do item + codigo do lote
- `Configuracoes.tsx` — nova aba **Sistema** com estatisticas gerais e botao **"Resetar para começar a usar lotes"**

### Migracao

**Reset obrigatorio antes de usar:** o sistema passa do modelo antigo para lotes,
entao todas as movimentacoes/saldos/lotes antigos devem ser apagados. Use a aba
**Configurações → Sistema → "Resetar para começar a usar lotes"** apos fazer o deploy.

Cadastros (itens, categorias, setores, doadores, beneficiarios, usuarios) sao mantidos.
