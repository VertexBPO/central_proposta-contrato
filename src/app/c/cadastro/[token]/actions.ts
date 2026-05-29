'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { gerarEEnviarContrato } from '@/lib/contrato/gerar'

interface Resultado {
  ok: boolean
  erro?: string
}

export interface CadastroInput {
  responsavel_nome: string
  responsavel_cargo: string
  responsavel_cpf: string
  responsavel_email: string
  responsavel_endereco_logradouro: string
  responsavel_endereco_numero: string
  responsavel_endereco_complemento: string
  responsavel_endereco_bairro: string
  responsavel_endereco_cidade: string
  responsavel_endereco_uf: string
  responsavel_endereco_cep: string
}

async function carregarPropostaAtiva(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('proposals')
    .select('id, client_id, status, magic_link_expira_em')
    .eq('magic_link_token', token)
    .maybeSingle()
  if (!data) return null
  if (data.magic_link_expira_em && new Date(data.magic_link_expira_em) < new Date()) return null
  return data as { id: string; client_id: string; status: string }
}

export async function salvarCadastroContrato(token: string, input: CadastroInput): Promise<Resultado> {
  if (!input.responsavel_nome.trim()) return { ok: false, erro: 'Informe o nome do responsável.' }
  if (!input.responsavel_cpf.trim()) return { ok: false, erro: 'Informe o CPF.' }
  if (!input.responsavel_email.trim()) return { ok: false, erro: 'Informe o e-mail corporativo.' }

  const prop = await carregarPropostaAtiva(token)
  if (!prop) return { ok: false, erro: 'Link inválido ou expirado.' }

  const statusAceitos = ['proposta_assinada', 'aguardando_cadastro']
  if (!statusAceitos.includes(prop.status)) {
    return { ok: false, erro: `Cadastro só pode ser preenchido após assinatura da proposta. Status atual: ${prop.status}.` }
  }

  const admin = createAdminClient()

  // Atualiza dados do cliente
  const { error: errCli } = await admin
    .from('clients')
    .update({
      responsavel_nome: input.responsavel_nome.trim(),
      responsavel_cargo: input.responsavel_cargo.trim() || null,
      responsavel_cpf: input.responsavel_cpf.replace(/\D/g, ''),
      responsavel_email: input.responsavel_email.trim(),
      responsavel_endereco_logradouro: input.responsavel_endereco_logradouro.trim() || null,
      responsavel_endereco_numero: input.responsavel_endereco_numero.trim() || null,
      responsavel_endereco_complemento: input.responsavel_endereco_complemento.trim() || null,
      responsavel_endereco_bairro: input.responsavel_endereco_bairro.trim() || null,
      responsavel_endereco_cidade: input.responsavel_endereco_cidade.trim() || null,
      responsavel_endereco_uf: input.responsavel_endereco_uf.trim().toUpperCase() || null,
      responsavel_endereco_cep: input.responsavel_endereco_cep.replace(/\D/g, '') || null,
    })
    .eq('id', prop.client_id)
  if (errCli) return { ok: false, erro: errCli.message }

  // Marca o cadastro como recebido
  await admin.from('proposals').update({ status: 'aguardando_cadastro' }).eq('id', prop.id)
  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'cliente_preencheu_cadastro_contrato',
    entidade: 'proposals',
    entidade_id: prop.id,
    depois: { status: 'aguardando_cadastro' },
  })

  // Gera o contrato (reaproveita dados proposta + cadastro), envia p/ ClickSign e notifica a Vertex.
  const contrato = await gerarEEnviarContrato(prop.id)
  if (!contrato.ok) return { ok: false, erro: contrato.erro ?? 'Cadastro salvo, mas falhou ao gerar o contrato.' }

  return { ok: true }
}
