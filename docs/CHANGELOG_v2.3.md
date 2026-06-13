# Changelog v2.3 — Bug fix do cadastro + ajustes de UX

## Corrigido

### "Internal server error" ao salvar item

O sistema anterior nao tinha tratamento global de excecoes, entao
qualquer erro inesperado caia no fallback do NestJS e virava
"Internal server error" sem detalhes.

**Mudancas:**

- **Global Exception Filter** (`common/all-exceptions.filter.ts`):
  Captura qualquer erro nao tratado em qualquer rota e devolve
  mensagem JSON descritiva. Tambem loga o erro completo no servidor
  (visivel nos logs do Render), facilitando diagnostico em producao.

- **Tratamento explicito no `ItensService.create()`**: validacoes
  passo-a-passo com mensagens claras (categoria nao existe, EAN
  duplicado, etc.) e captura de erros do Prisma com traducao
  amigavel.

- **Payload do frontend limpo**: trim em strings, conversao de
  tipos, campos vazios viram `undefined` em vez de string vazia,
  para evitar surpresas com o Prisma.

A partir desta versao, qualquer erro de cadastro de item exibe
o motivo real ("Categoria nao existe mais", "Codigo de barras ja
cadastrado para X", etc.) em vez de mensagem generica.

## Ajustes de UX

### Campo "Unidade" agora e placeholder

Antes: o campo vinha pre-preenchido com "un" — o usuario precisava
apagar antes de digitar outra unidade (kg, ml, l, etc.).

Agora: o campo vem vazio, com **"un (padrão)" como placeholder
visivel**. Se voce deixar vazio, o sistema salva como "un"
automaticamente. Se digitar algo (ex: "kg"), salva o que voce digitou.

### Setor removido do cadastro de item

Antes: o form de novo item tinha campo "Setor" — confuso porque o
setor real fica relacionado a saida, nao ao cadastro do produto.

Agora: o setor **so aparece na hora da saida** (distribuicao). O
cadastro do item ficou com 1 campo a menos, mais limpo e direto.

> Observacao: o campo continua existindo no banco (alguns itens
> antigos podem ter setor associado). Se voce editar um item que
> ja tinha setor, ele e preservado, mas voce nao tem mais como
> definir ou alterar pela tela de itens. Se quiser limpar setores
> antigos, vamos precisar de uma tela auxiliar.

## Arquivos alterados

- `backend/src/common/all-exceptions.filter.ts` (novo)
- `backend/src/main.ts` (registra filter)
- `backend/src/itens/itens.service.ts` (validacoes + try/catch)
- `frontend/src/pages/Itens.tsx` (form simplificado + payload limpo)
