-- =============================================================================
-- FLUXO CLICKSIGN — assinatura da PROPOSTA + rename zapsign_* -> clicksign_*
-- =============================================================================
-- Alinha o schema ao fluxo canônico (ver memória fluxo-end-to-end):
--   1) proposals ganha colunas de assinatura (proposta também é assinada agora)
--   2) contracts: zapsign_* -> clicksign_* + colunas por signatário (Vertex/cliente)
-- App ainda não está em produção (branch feat/initial-setup) — rename é seguro.
-- Os status canônicos já existem no CHECK desde 20260529000001.
-- =============================================================================

-- 1) PROPOSALS — assinatura da proposta -------------------------------------
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS clicksign_doc_id        text,
  ADD COLUMN IF NOT EXISTS assinatura_vertex_key   text,  -- request_signature_key do signatário Vertex
  ADD COLUMN IF NOT EXISTS assinatura_cliente_key  text,  -- request_signature_key do signatário cliente
  ADD COLUMN IF NOT EXISTS enviado_assinatura_em   timestamptz,
  ADD COLUMN IF NOT EXISTS vertex_assinou_em       timestamptz,
  ADD COLUMN IF NOT EXISTS cliente_assinou_em      timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_assinado_path       text;

-- 2) CONTRACTS — rename zapsign_* -> clicksign_* ----------------------------
ALTER TABLE public.contracts RENAME COLUMN zapsign_doc_id     TO clicksign_doc_id;
ALTER TABLE public.contracts RENAME COLUMN zapsign_url        TO clicksign_url;
ALTER TABLE public.contracts RENAME COLUMN enviado_zapsign_em TO enviado_assinatura_em;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS assinatura_vertex_key  text,
  ADD COLUMN IF NOT EXISTS assinatura_cliente_key text,
  ADD COLUMN IF NOT EXISTS vertex_assinou_em      timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_assinado_path      text;

-- Índices para o webhook localizar por doc key ------------------------------
CREATE INDEX IF NOT EXISTS idx_proposals_clicksign_doc ON public.proposals(clicksign_doc_id);
CREATE INDEX IF NOT EXISTS idx_contracts_clicksign_doc ON public.contracts(clicksign_doc_id);
