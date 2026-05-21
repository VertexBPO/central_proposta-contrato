-- =============================================================================
-- Central de Propostas e Contratos — Schema inicial
-- =============================================================================
-- Data: 2026-05-21
-- Decisões: vide planejamento.md (Fase 5)

-- =============================================================================
-- 1. USERS — admin/operador (complementa auth.users)
-- =============================================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  papel text NOT NULL CHECK (papel IN ('admin', 'operador')),
  ativo boolean NOT NULL DEFAULT true,
  mfa_habilitado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_papel ON public.users(papel) WHERE ativo = true;

-- =============================================================================
-- 2. CLIENTS — empresas clientes
-- =============================================================================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  responsavel_nome text,
  email text NOT NULL,
  telefone text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_uf text CHECK (endereco_uf ~ '^[A-Z]{2}$'),
  endereco_cep text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  deletado_em timestamptz,
  deletado_por uuid REFERENCES public.users(id)
);

CREATE INDEX idx_clients_cnpj ON public.clients(cnpj) WHERE deletado_em IS NULL;
CREATE INDEX idx_clients_razao_social ON public.clients USING gin (to_tsvector('portuguese', razao_social)) WHERE deletado_em IS NULL;

-- =============================================================================
-- 3. CONTRACT_TEMPLATES — modelos de contrato
-- =============================================================================
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  corpo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_templates_ativo ON public.contract_templates(ativo);

-- =============================================================================
-- 4. PROPOSAL_TEMPLATES — modelos de proposta (com FK p/ contrato)
-- =============================================================================
CREATE TABLE public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  descricao text,
  escopo_padrao text NOT NULL,
  contract_template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE RESTRICT,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_templates_ativo ON public.proposal_templates(ativo);
CREATE INDEX idx_proposal_templates_contract ON public.proposal_templates(contract_template_id);

-- =============================================================================
-- 5. EMAIL_TEMPLATES — HTML dos e-mails (envio/lembrete/etc.)
-- =============================================================================
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text UNIQUE NOT NULL CHECK (tipo IN ('envio_proposta', 'lembrete', 'envio_contrato', 're_aceite', 'reabertura')),
  assunto text NOT NULL,
  corpo_html text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. PROPOSALS — núcleo
-- =============================================================================
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  proposal_template_id uuid NOT NULL REFERENCES public.proposal_templates(id) ON DELETE RESTRICT,
  contract_template_id_override uuid REFERENCES public.contract_templates(id) ON DELETE RESTRICT,
  operador_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  aprovador_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho',
    'aguardando_aprovacao',
    'aprovada',
    'enviada',
    'aberta',
    'em_negociacao',
    'fechada',
    'aguardando_re_aceite',
    'contrato_gerado',
    'devolvida',
    'rejeitada',
    'perdida',
    'cancelada'
  )),
  escopo_final text NOT NULL,
  escopo_tipo text NOT NULL CHECK (escopo_tipo IN ('padrao', 'editado', 'personalizado')),
  prazo_meses integer NOT NULL CHECK (prazo_meses > 0 AND prazo_meses <= 60),
  valor_adesao numeric(15,2) NOT NULL DEFAULT 0 CHECK (valor_adesao >= 0),
  num_parcelas integer NOT NULL CHECK (num_parcelas > 0),
  valor_parcela numeric(15,2) NOT NULL CHECK (valor_parcela > 0),
  data_proposta date NOT NULL DEFAULT current_date,
  data_inicio_contrato date NOT NULL,
  forma_aceite text CHECK (forma_aceite IN ('email', 'whatsapp', 'verbal', 'outro')),
  forma_aceite_descricao text,
  motivo_perdida text,
  motivo_devolucao text,
  motivo_cancelamento text,
  aceito_em timestamptz,
  magic_link_token text UNIQUE,
  magic_link_expira_em timestamptz,
  pdf_storage_path text,
  docx_storage_path text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_client ON public.proposals(client_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_data ON public.proposals(data_proposta DESC);
CREATE INDEX idx_proposals_operador ON public.proposals(operador_id);
CREATE INDEX idx_proposals_template ON public.proposals(proposal_template_id);
CREATE INDEX idx_proposals_magic_token ON public.proposals(magic_link_token) WHERE magic_link_token IS NOT NULL;

-- =============================================================================
-- 7. CONTRACTS — gerado quando proposta fechada (1:1)
-- =============================================================================
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid UNIQUE NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  numero text UNIQUE NOT NULL,
  pdf_storage_path text,
  docx_storage_path text,
  zapsign_doc_id text,
  zapsign_url text,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  enviado_zapsign_em timestamptz,
  assinado_em timestamptz,
  assinatura_url text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_proposal ON public.contracts(proposal_id);

-- =============================================================================
-- 8. EMAIL_LOGS — tracking de e-mails enviados
-- =============================================================================
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  destinatario text NOT NULL,
  assunto text NOT NULL,
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'entregue', 'aberto', 'clicado', 'bounce', 'falha')),
  resend_id text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  aberto_em timestamptz,
  bounce_motivo text
);

CREATE INDEX idx_email_logs_proposal ON public.email_logs(proposal_id);
CREATE INDEX idx_email_logs_enviado ON public.email_logs(enviado_em DESC);

-- =============================================================================
-- 9. AUDIT_LOGS — ações críticas
-- =============================================================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  antes jsonb,
  depois jsonb,
  justificativa text,
  ip text,
  user_agent text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_criado ON public.audit_logs(criado_em DESC);

-- =============================================================================
-- 10. PARAMETERS — single-row de configurações globais
-- =============================================================================
CREATE TABLE public.parameters (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email_vertex text NOT NULL,
  contratante_razao_social text NOT NULL,
  contratante_cnpj text NOT NULL,
  contratante_endereco text NOT NULL,
  intervalo_lembrete_dias integer NOT NULL DEFAULT 5 CHECK (intervalo_lembrete_dias > 0),
  max_lembretes integer NOT NULL DEFAULT 3 CHECK (max_lembretes >= 0),
  timeout_contrato_dias integer NOT NULL DEFAULT 30 CHECK (timeout_contrato_dias > 0),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- TRIGGERS — atualizado_em automático
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_atualizado BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_clients_atualizado BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_contract_templates_atualizado BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_proposal_templates_atualizado BEFORE UPDATE ON public.proposal_templates FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_email_templates_atualizado BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_proposals_atualizado BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_contracts_atualizado BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_parameters_atualizado BEFORE UPDATE ON public.parameters FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- =============================================================================
-- RLS — Row-Level Security
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters ENABLE ROW LEVEL SECURITY;

-- Helper: identifica admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND papel = 'admin' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_operador()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND papel = 'operador' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS: admin lê/escreve tudo; operador lê só a si mesmo
CREATE POLICY users_admin_all ON public.users FOR ALL TO authenticated USING (is_admin());
CREATE POLICY users_self_read ON public.users FOR SELECT TO authenticated USING (id = auth.uid());

-- CLIENTS: admin tudo; operador lê os clientes das próprias propostas
CREATE POLICY clients_admin_all ON public.clients FOR ALL TO authenticated USING (is_admin());
CREATE POLICY clients_operador_read ON public.clients FOR SELECT TO authenticated USING (
  is_operador() AND EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.client_id = clients.id AND proposals.operador_id = auth.uid()
  )
);
CREATE POLICY clients_operador_insert ON public.clients FOR INSERT TO authenticated WITH CHECK (is_operador());
CREATE POLICY clients_operador_update ON public.clients FOR UPDATE TO authenticated USING (
  is_operador() AND EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.client_id = clients.id AND proposals.operador_id = auth.uid()
  )
);

-- CONTRACT_TEMPLATES: admin escreve; operador lê só ativos
CREATE POLICY contract_templates_admin_all ON public.contract_templates FOR ALL TO authenticated USING (is_admin());
CREATE POLICY contract_templates_operador_read ON public.contract_templates FOR SELECT TO authenticated USING (is_operador() AND ativo = true);

-- PROPOSAL_TEMPLATES: idem
CREATE POLICY proposal_templates_admin_all ON public.proposal_templates FOR ALL TO authenticated USING (is_admin());
CREATE POLICY proposal_templates_operador_read ON public.proposal_templates FOR SELECT TO authenticated USING (is_operador() AND ativo = true);

-- EMAIL_TEMPLATES: só admin
CREATE POLICY email_templates_admin_all ON public.email_templates FOR ALL TO authenticated USING (is_admin());

-- PROPOSALS: admin tudo; operador só as próprias
CREATE POLICY proposals_admin_all ON public.proposals FOR ALL TO authenticated USING (is_admin());
CREATE POLICY proposals_operador_own ON public.proposals FOR ALL TO authenticated USING (is_operador() AND operador_id = auth.uid());

-- CONTRACTS: admin tudo; operador só dos contratos de propostas próprias
CREATE POLICY contracts_admin_all ON public.contracts FOR ALL TO authenticated USING (is_admin());
CREATE POLICY contracts_operador_read ON public.contracts FOR SELECT TO authenticated USING (
  is_operador() AND EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = contracts.proposal_id AND proposals.operador_id = auth.uid()
  )
);

-- EMAIL_LOGS: admin tudo; operador só dos próprios
CREATE POLICY email_logs_admin_all ON public.email_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY email_logs_operador_read ON public.email_logs FOR SELECT TO authenticated USING (
  is_operador() AND EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = email_logs.proposal_id AND proposals.operador_id = auth.uid()
  )
);

-- AUDIT_LOGS: admin tudo; operador só ações próprias
CREATE POLICY audit_logs_admin_all ON public.audit_logs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY audit_logs_operador_own ON public.audit_logs FOR SELECT TO authenticated USING (is_operador() AND user_id = auth.uid());

-- PARAMETERS: só admin
CREATE POLICY parameters_admin_all ON public.parameters FOR ALL TO authenticated USING (is_admin());

-- =============================================================================
-- SEED — registro inicial de parameters
-- =============================================================================
INSERT INTO public.parameters (
  id,
  email_vertex,
  contratante_razao_social,
  contratante_cnpj,
  contratante_endereco
) VALUES (
  1,
  'contato@vertexbpo.com.br',
  'Vertex BPO e Assessoria Empresarial',
  '00.000.000/0001-00',
  'Vila Velha, ES'
);
