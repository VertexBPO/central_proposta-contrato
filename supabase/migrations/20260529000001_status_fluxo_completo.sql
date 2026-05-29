-- =============================================================================
-- STATUS — fluxo completo proposta → assinatura → cadastro → contrato → assinatura
-- =============================================================================
-- Mantém os status legados pra compatibilidade. Adiciona os novos do fluxo:
--   aprovada_cliente, proposta_assinatura_pendente, proposta_assinada,
--   aguardando_cadastro, contrato_assinatura_pendente, contrato_assinado
-- =============================================================================

ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN (
    -- Etapa 1: Vertex monta
    'rascunho',
    'aguardando_aprovacao',
    'aprovada',
    'devolvida',
    'rejeitada',
    -- Etapa 2: cliente recebe e decide
    'enviada',
    'aberta',
    'em_negociacao',          -- legado, mantém pra dados antigos
    'aprovada_cliente',       -- NOVO: cliente aprovou, pronto p/ assinar proposta
    -- Etapa 3: assinatura da proposta (ZapSign)
    'proposta_assinatura_pendente',  -- NOVO
    'proposta_assinada',             -- NOVO: ambos assinaram a proposta
    -- Etapa 4: cliente preenche cadastro pra gerar contrato
    'aguardando_cadastro',    -- NOVO: link enviado pro cliente preencher
    -- Etapa 5: contrato + assinatura
    'contrato_gerado',
    'contrato_assinatura_pendente',  -- NOVO
    'contrato_assinado',             -- NOVO: FECHADO (final feliz)
    -- Outros estados legados
    'fechada',                -- legado, equivalente a proposta_assinada
    'aguardando_re_aceite',   -- legado
    -- Terminais
    'perdida',
    'cancelada'
  ));
