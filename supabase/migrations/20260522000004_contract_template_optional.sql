-- Torna contract_template_id opcional em proposal_templates
-- (template de proposta pode ser cadastrado sem vínculo a contrato)

ALTER TABLE public.proposal_templates
  ALTER COLUMN contract_template_id DROP NOT NULL;
