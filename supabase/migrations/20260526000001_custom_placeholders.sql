-- =============================================================================
-- CUSTOM PLACEHOLDERS — placeholders criados pelo admin via UI
-- =============================================================================
-- Cada placeholder tem nome (usado em {{nome}}), descrição (label do campo)
-- e categoria (em qual contexto aparece). O VALOR é digitado pelo operador
-- ao criar uma proposta — salvo em proposals.custom_values (jsonb).
-- =============================================================================

CREATE TABLE public.custom_placeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL CHECK (categoria IN ('proposta_assessoria', 'proposta_bpo', 'contrato')),
  nome text NOT NULL,
  descricao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria, nome)
);

CREATE INDEX idx_custom_placeholders_categoria ON public.custom_placeholders(categoria) WHERE ativo = true;

CREATE TRIGGER trg_custom_placeholders_atualizado
  BEFORE UPDATE ON public.custom_placeholders
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

ALTER TABLE public.custom_placeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_placeholders_admin_all ON public.custom_placeholders
  FOR ALL TO authenticated USING (is_admin());

CREATE POLICY custom_placeholders_operador_read ON public.custom_placeholders
  FOR SELECT TO authenticated USING (is_operador() AND ativo = true);

-- Coluna pra guardar os valores digitados na proposta
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS custom_values jsonb NOT NULL DEFAULT '{}'::jsonb;
