-- Adiciona referência ao arquivo .docx do template no Storage
-- Esse passa a ser a fonte de verdade do conteúdo (substitui o uso do campo `corpo`/`escopo_padrao`).

ALTER TABLE public.contract_templates
  ADD COLUMN template_file_path text;

ALTER TABLE public.proposal_templates
  ADD COLUMN template_file_path text;

ALTER TABLE public.scope_templates
  ADD COLUMN template_file_path text;

-- Bucket adicional pra templates (separado dos PDFs de propostas)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('templates', 'templates', false, 20971520) -- 20MB
ON CONFLICT (id) DO NOTHING;
