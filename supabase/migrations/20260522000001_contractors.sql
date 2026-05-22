-- Adiciona tabela `contractors` (entidades Vertex que aparecem como CONTRATADA)
-- e refatora parameters para remover dados do contratante (que agora ficam por linha).

-- 1) Nova tabela
CREATE TABLE public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  endereco text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contractors_ativo ON public.contractors(ativo);

CREATE TRIGGER trg_contractors_atualizado
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- 2) RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY contractors_admin_all ON public.contractors FOR ALL TO authenticated USING (is_admin());
CREATE POLICY contractors_operador_read ON public.contractors FOR SELECT TO authenticated USING (is_operador() AND ativo = true);

-- 3) FK em proposals
ALTER TABLE public.proposals
  ADD COLUMN contractor_id uuid REFERENCES public.contractors(id) ON DELETE RESTRICT;

CREATE INDEX idx_proposals_contractor ON public.proposals(contractor_id);

-- 4) Migrar dados do parameters para um primeiro contractor
INSERT INTO public.contractors (razao_social, cnpj, endereco, ativo)
SELECT contratante_razao_social, contratante_cnpj, contratante_endereco, true
FROM public.parameters
WHERE id = 1
ON CONFLICT (cnpj) DO NOTHING;

-- 5) Preencher contractor_id nas propostas existentes
UPDATE public.proposals p
SET contractor_id = (
  SELECT id FROM public.contractors
  WHERE cnpj = (SELECT contratante_cnpj FROM public.parameters WHERE id = 1)
  LIMIT 1
)
WHERE contractor_id IS NULL;

-- 6) Remover colunas obsoletas de parameters
ALTER TABLE public.parameters
  DROP COLUMN IF EXISTS contratante_razao_social,
  DROP COLUMN IF EXISTS contratante_cnpj,
  DROP COLUMN IF EXISTS contratante_endereco;
