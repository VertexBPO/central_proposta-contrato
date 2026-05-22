# TASKS — Central de Propostas e Contratos

## Bloqueado (aguardando reset CloudConvert às 21h Brasília)
- Validar PDF da proposta com todas as correções aplicadas (escopo justificado + bullets + watermark 10%)

## Em andamento
- Refinamento do fluxo de geração de PDF

## Concluído (branch `feat/initial-setup`)

### Setup base
- [x] Scaffold Next.js 16 (TS + App Router + sem Tailwind)
- [x] Supabase (projeto `tbkwacqbswvvdlkostez`) — 10 tabelas, RLS, seed
- [x] `.env.local` com Supabase + CloudConvert
- [x] Vercel linkado, deploy automático na branch
- [x] CloudConvert (plano free — 25 conversões/dia)

### Auth + estrutura
- [x] Middleware de proteção de rotas
- [x] Login (hard reload com window.location.href)
- [x] Layout autenticado (sidebar + header)
- [x] Helper de papéis (admin vs operador)

### Design System
- [x] Componentes base: Button, Input, Select, Card, Modal, Badge, Textarea, PageHeader, UploadDocx

### Cadastros
- [x] Contratantes (clientes — quem paga)
- [x] Contratada (Vertex BPO)
- [x] Usuários (admin + operador)
- [x] Parâmetros

### Templates
- [x] CRUD templates de propostas (.docx upload, baixar, editar, **apagar**)
- [x] CRUD templates de contratos (.docx upload, vinculados à proposta)
- [x] CRUD templates de escopos (.docx upload)
- [x] Storage bucket `templates` com RLS (admin write, operador read)
- [x] UploadDocx limpa arquivo antigo do Storage ao substituir

### Nova proposta
- [x] Form 3 seções (Contratante / Proposta / Comercial)
- [x] Lookup CNPJ auto ao digitar 14 dígitos (BrasilAPI + ReceitaWS fallback + User-Agent)
- [x] Auto-preenche razão social + endereço completo
- [x] Magic link 24h pro contratante completar dados

### Dashboard
- [x] Cards por status com counts
- [x] Lista de propostas com filtro
- [x] Ações na row: 📄 PDF, 🔗 Link, ❌ Perdida, 🗑️ Apagar (admin)

### Detalhe proposta
- [x] Visualizar PDF do Contrato
- [x] Ações de fluxo (submeter, aprovar, devolver, rejeitar, enviar, fechar, cancelar)
- [x] Histórico (audit logs)

### Geração de PDF
- [x] docxtemplater + CloudConvert (LibreOffice engine)
- [x] Path B: extração XML do escopo + injeção via `{{@escopo}}`
- [x] Corretor de formatação: justificado + indent bullets + remove page breaks
- [x] Watermark alpha automático 10% via Sharp
- [x] Cache-Control no-store nas rotas + timestamp na URL

### Telas do cliente (magic link)
- [x] `/c/[token]` auto-login
- [x] `/c/preencher` form de dados
- [x] `/c/confirmado`

### Rename UI
- [x] Sidebar: Clientes → Contratantes / Contratantes → Contratada
- [x] Form e detalhes: terminologia jurídica consistente

## Pendente

### Fluxo cliente (após receber proposta)
- [ ] Aceite/rejeição via e-mail
- [ ] Modal com observações na rejeição

### Integrações
- [ ] Resend (e-mail transacional) — conta + domínio verificado
- [ ] ZapSign (assinatura digital) — token + integração

### Word template (responsabilidade do usuário)
- [ ] Ajustar margem superior do template proposta pra 3.5cm (evitar overlap com logo)

### Otimização
- [ ] Cache real de PDF (só regenera se proposta mudou)
- [ ] Fallback LibreOffice local pra dev (não burnar créditos CloudConvert testando)

### Deploy
- [ ] Merge `feat/initial-setup` → `main` após validação
- [ ] Domínio custom

### Documentação
- [ ] `banco-de-dados.md` (schema completo)
- [ ] `homologacao.md` (matriz de testes)
