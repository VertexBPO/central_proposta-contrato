-- Biblioteca de escopos reutilizáveis (Gestão Financeira, Gestão Preços, etc.)
-- Cada proposta combina 1 template + 1 escopo da biblioteca.

CREATE TABLE public.scope_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  descricao text,
  corpo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scope_templates_ativo ON public.scope_templates(ativo);

CREATE TRIGGER trg_scope_templates_atualizado
  BEFORE UPDATE ON public.scope_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- RLS
ALTER TABLE public.scope_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY scope_templates_admin_all ON public.scope_templates FOR ALL TO authenticated USING (is_admin());
CREATE POLICY scope_templates_operador_read ON public.scope_templates FOR SELECT TO authenticated USING (is_operador() AND ativo = true);

-- FK opcional em proposals (mantém escopo_final como snapshot)
ALTER TABLE public.proposals
  ADD COLUMN scope_template_id uuid REFERENCES public.scope_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_proposals_scope ON public.proposals(scope_template_id);

-- Escopo_padrao em proposal_templates vira opcional
ALTER TABLE public.proposal_templates
  ALTER COLUMN escopo_padrao DROP NOT NULL;
