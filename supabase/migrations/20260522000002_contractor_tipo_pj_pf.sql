-- Contratante pode ser PJ ou PF.
-- Renomeia `cnpj` -> `documento` e adiciona `tipo`.

ALTER TABLE public.contractors
  ADD COLUMN tipo text NOT NULL DEFAULT 'PJ' CHECK (tipo IN ('PJ', 'PF'));

ALTER TABLE public.contractors
  RENAME COLUMN cnpj TO documento;

-- O índice único permanece (com novo nome lógico)
-- e em PG o constraint permanece mesmo após rename.

COMMENT ON COLUMN public.contractors.tipo IS 'PJ (CNPJ) ou PF (CPF)';
COMMENT ON COLUMN public.contractors.documento IS 'CNPJ se tipo=PJ, CPF se tipo=PF (sem formatação)';
