# Banco de Dados — Central de Propostas e Contratos

Supabase (Postgres 15), projeto `tbkwacqbswvvdlkostez`, região do banco em SA.
**RLS habilitada em todas as 13 tabelas.** Dinheiro em `numeric`, IDs em `uuid`, status em `text` + CHECK.

Migrations em [`supabase/migrations/`](../supabase/migrations/). Conexão direta para DDL:
`db.tbkwacqbswvvdlkostez.supabase.co:5432` (user `postgres`, senha em `Credenciais/supabase/central-propostas-contratos.env`).

## Tabelas

### users
Usuários internos (admin / operador). Vinculado ao `auth.users` do Supabase pelo `id`.
`id, nome, email, papel (admin|operador), ativo, mfa_habilitado, criado_em, atualizado_em`

### clients
Contratantes (clientes que pagam). Soft delete (`deletado_em`/`deletado_por`).
`id, razao_social, cnpj, email, telefone, endereco_* (logradouro/numero/complemento/bairro/cidade/uf/cep),`
`responsavel_nome, responsavel_cargo, responsavel_cpf, responsavel_email, responsavel_endereco_* , criado_em, atualizado_em, deletado_em, deletado_por`

### contractors
Contratada (Vertex). PJ ou PF.
`id, tipo (PJ|PF), razao_social, documento (CNPJ/CPF), endereco, ativo, criado_em, atualizado_em`

### proposal_templates
Templates de proposta (.docx no Storage). 1:1 com contract_templates via `contract_template_id`.
`id, nome, slug, descricao, escopo_padrao, contract_template_id, template_file_path, ativo, ...`

### contract_templates
Templates de contrato (.docx no Storage).
`id, nome, slug, corpo, template_file_path, ativo, ...`

### scope_templates
Templates de escopo (.docx).
`id, nome, slug, descricao, corpo, template_file_path, ativo, ...`

### custom_placeholders
Placeholders customizados criados via UI.
`id, categoria (proposta_assessoria|proposta_bpo|contrato), nome, descricao, ativo, ...`

### email_templates
`id, tipo (envio_proposta|lembrete|envio_contrato|re_aceite|reabertura), assunto, corpo_html, atualizado_em`

### proposals
Coração do sistema. Status segue a esteira do fluxo (ver memória fluxo-end-to-end).
- Dados: `numero, client_id, contractor_id, proposal_template_id, contract_template_id_override, scope_template_id, operador_id, aprovador_id`
- Comercial: `escopo_final, escopo_tipo, prazo_meses, valor_adesao, num_parcelas, valor_parcela, data_proposta, data_inicio_contrato, custom_values (jsonb)`
- Status/fluxo: `status, forma_aceite*, motivo_perdida/devolucao/cancelamento, aceito_em`
- Magic link: `magic_link_token, magic_link_expira_em`
- PDFs: `pdf_storage_path, docx_storage_path, pdf_assinado_path`
- **Assinatura ClickSign (proposta):** `clicksign_doc_id, assinatura_vertex_key, assinatura_cliente_key, enviado_assinatura_em, vertex_assinou_em, cliente_assinou_em`

### contracts
Um por proposta (`proposal_id` UNIQUE).
`id, proposal_id, numero, pdf_storage_path, docx_storage_path, pdf_assinado_path, gerado_em, assinado_em, assinatura_url,`
**ClickSign:** `clicksign_doc_id, clicksign_url, assinatura_vertex_key, assinatura_cliente_key, enviado_assinatura_em, vertex_assinou_em`

### email_logs
`id, proposal_id, tipo, destinatario, assunto, status, resend_id, enviado_em, aberto_em, bounce_motivo`

### audit_logs
`id, user_id, acao, entidade, entidade_id, antes (jsonb), depois (jsonb), justificativa, ip, user_agent, criado_em`

### parameters
Linha única (`id=1`).
`email_vertex, intervalo_lembrete_dias, max_lembretes, timeout_contrato_dias, atualizado_em`

## Status da proposta (esteira)
`rascunho → aguardando_aprovacao → aprovada → proposta_assinatura_pendente → proposta_assinada → aguardando_cadastro → contrato_assinatura_pendente → contrato_assinado`. Terminais: `perdida`, `cancelada`. Legados mantidos no CHECK: `enviada, aberta, em_negociacao, aprovada_cliente, contrato_gerado, fechada, aguardando_re_aceite, devolvida, rejeitada`.

## Storage (buckets)
- `templates` — .docx dos templates (admin write, operador read)
- `documentos` — PDFs gerados (propostas/, contratos/)
