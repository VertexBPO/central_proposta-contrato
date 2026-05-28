-- =============================================================================
-- RESPONSÁVEL — dados completos do responsável do contratante
-- =============================================================================
-- Pra usar nas propostas e contratos: nome, cargo, CPF, endereço residencial,
-- email corporativo. responsavel_nome já existia. Os demais ficam opcionais.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS responsavel_cargo text,
  ADD COLUMN IF NOT EXISTS responsavel_cpf text,
  ADD COLUMN IF NOT EXISTS responsavel_email text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_logradouro text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_numero text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_complemento text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_bairro text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_cidade text,
  ADD COLUMN IF NOT EXISTS responsavel_endereco_uf text CHECK (responsavel_endereco_uf IS NULL OR responsavel_endereco_uf ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS responsavel_endereco_cep text;
