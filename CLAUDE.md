@AGENTS.md

# Central de Propostas e Contratos

Regras específicas deste projeto. Sobrescreve o CLAUDE.md global onde houver conflito.

## Stack

- Next.js 15 (App Router, TypeScript)
- CSS inline com inline styles (sem Tailwind)
- Supabase (Postgres 15 + Auth + Storage) — projeto `tbkwacqbswvvdlkostez`
- Vercel (deploy)
- Resend (e-mail transacional)
- ZapSign (assinatura digital)

## Workflow obrigatório

1. **Nunca pushar direto na `main`** — `main` é produção
2. Criar branch: `feat/nome-curto` ou `fix/nome-curto`
3. Push na branch → Vercel cria preview automático
4. **Usuário testa no preview** antes de qualquer merge
5. Após aprovação, merge pra `main` via PR

## Regras de banco

- Dinheiro: `numeric(15,2)`, nunca float
- IDs: `uuid` (`gen_random_uuid()`)
- Status: `text` + `CHECK` (nunca enum)
- RLS obrigatória em toda tabela
- Soft delete em `clients` e `users` (`deletado_em` + `deletado_por`)

## Regra de alçada

- Operador **não pode** aprovar próprias propostas
- Operador **não pode** excluir/cancelar nada
- Admin pode tudo, sem restrição
- Cliente acessa uma única vez (magic link) — preenche dados e sai

## Templates

- `proposal_templates` 1:1 → `contract_templates` (FK obrigatória)
- Operador escolhe só template de proposta (contrato vinculado entra automático)
- Admin pode sobrescrever via `contract_template_id_override` na proposta

## Identidade visual

- Cor primária: `#0D1B3E` (azul Vertex)
- Fundo: `#F0F4FB` / `#FFFFFF`
- Texto: `#0D1B3E` / secundário `#8A9AB5`
- Tipografia: Inter
- Logos em `/Users/sandroalves/Claude/Identidade Visual_Vertex/`

## Referências

- `../Toolbox_CPC/projeto.md` — spec do produto
- `../Toolbox_CPC/planejamento.md` — decisões do /businnes-plan
- `../Toolbox_CPC/Modelos_*` — templates Word reais p/ seed
