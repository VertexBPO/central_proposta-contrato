# TASKS — Central de Propostas e Contratos

## Em andamento
- Setup inicial do projeto

## Pendente (ordem sugerida)

### Setup base
- [x] Scaffold Next.js (TS + App Router + sem Tailwind)
- [x] Install deps (Supabase + Zustand + TanStack Query)
- [x] `.env.local` configurado (Supabase OK; Resend/ZapSign pendentes)
- [x] Migration inicial aplicada (10 tabelas + RLS + seed parameters)
- [x] Supabase clients (browser, server, admin)
- [ ] Conta Resend criada + domínio verificado
- [ ] Conta ZapSign criada + API token
- [ ] Linkar repo no Vercel
- [ ] Configurar env vars na Vercel

### Auth + estrutura
- [ ] Middleware de proteção de rotas
- [ ] Tela `/login` (admin/operador)
- [ ] Tela `/esqueci-senha`
- [ ] Layout autenticado (sidebar + header)
- [ ] Helper de papéis (admin vs operador)

### Design System
- [ ] `DESIGN_SYSTEM.md` formal
- [ ] Tokens (cores, espaçamento, tipografia, radius, shadows)
- [ ] Componentes base: Button, Input, Select, Card, Modal, Table, Toast
- [ ] Componentes de feedback: Loading, Empty, ErrorState

### Telas do cliente (mobile-first)
- [ ] `/c/[token]` — auto-login via magic link
- [ ] `/c/preencher` — form de dados da empresa
- [ ] `/c/confirmado` — confirmação

### Telas do operador/admin (desktop)
- [ ] `/dashboard` (cards + filtros + lista)
- [ ] `/propostas/nova` — wizard 4 passos
- [ ] `/propostas/[id]` — detalhe + timeline + ações
- [ ] `/propostas/[id]/preview` — viewer PDF abas
- [ ] `/clientes` (lista)
- [ ] `/clientes/[id]` (timeline da empresa)
- [ ] `/notificacoes`
- [ ] `/conta`

### Telas do admin
- [ ] `/aprovacoes`
- [ ] `/templates/propostas` (CRUD)
- [ ] `/templates/contratos` (CRUD)
- [ ] `/templates/emails` (CRUD)
- [ ] `/usuarios` (CRUD)
- [ ] `/parametros`
- [ ] `/auditoria`

### Integrações
- [ ] Resend — envio de e-mail (proposta, lembrete, contrato)
- [ ] ZapSign — geração de doc + widget embed
- [ ] Geração PDF (`pdf-lib`)
- [ ] Geração DOCX (`docxtemplater`)
- [ ] Edge Function — cron de lembretes (5/15/30 dias)

### Deploy
- [ ] Build local sem erros
- [ ] Deploy preview branch
- [ ] Testes em iPhone real
- [ ] Domínio custom (se houver)

### Documentação
- [ ] `banco-de-dados.md` (schema completo comentado)
- [ ] `homologacao.md` (matriz de testes)
