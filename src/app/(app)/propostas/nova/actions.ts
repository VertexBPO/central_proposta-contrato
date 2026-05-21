'use server'

import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarNumeroProposta } from '@/lib/db/proposta-numero'
import { onlyDigits, validateCnpj } from '@/lib/db/cnpj'
import { EscopoTipo } from '@/lib/db/types'

interface NovaPropostaInput {
  // cliente
  client_id?: string // se já existe
  cnpj?: string
  razao_social?: string
  email_cliente?: string
  // proposta
  proposal_template_id: string
  escopo_tipo: EscopoTipo
  escopo_final: string
  // comercial
  prazo_meses: number
  valor_adesao: number
  num_parcelas: number
  valor_parcela: number
  data_inicio_contrato: string
  // opcional
  enviar_magic_link?: boolean
}

interface Resultado {
  ok: boolean
  proposta_id?: string
  magic_link?: string
  erro?: string
}

export async function criarProposta(input: NovaPropostaInput): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada.' }

  const admin = createAdminClient()

  // 1) Resolver cliente
  let clientId = input.client_id
  if (!clientId) {
    if (!input.cnpj || !input.razao_social || !input.email_cliente) {
      return { ok: false, erro: 'Informe CNPJ, razão social e e-mail do cliente.' }
    }
    const cnpj = onlyDigits(input.cnpj)
    if (!validateCnpj(cnpj)) return { ok: false, erro: 'CNPJ inválido.' }

    // Tenta achar por CNPJ
    const { data: existente } = await admin
      .from('clients')
      .select('id')
      .eq('cnpj', cnpj)
      .is('deletado_em', null)
      .maybeSingle()

    if (existente) {
      clientId = existente.id
    } else {
      const { data: novoCli, error: e1 } = await admin
        .from('clients')
        .insert({
          cnpj,
          razao_social: input.razao_social.trim(),
          email: input.email_cliente.trim(),
        })
        .select('id')
        .single()
      if (e1 || !novoCli) return { ok: false, erro: `Erro ao criar cliente: ${e1?.message}` }
      clientId = novoCli.id
    }
  }

  // 2) Validar template e pegar contract template vinculado
  const { data: template, error: e2 } = await admin
    .from('proposal_templates')
    .select('id, contract_template_id, ativo')
    .eq('id', input.proposal_template_id)
    .maybeSingle()

  if (e2 || !template || !template.ativo) {
    return { ok: false, erro: 'Template de proposta inválido ou inativo.' }
  }

  // 3) Gerar número
  const numero = await gerarNumeroProposta(admin)

  // 4) Magic link (opcional)
  let magic_link_token: string | null = null
  let magic_link_expira_em: string | null = null
  if (input.enviar_magic_link) {
    magic_link_token = randomUUID()
    magic_link_expira_em = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  // 5) Criar proposta
  const { data: proposta, error: e3 } = await admin
    .from('proposals')
    .insert({
      numero,
      client_id: clientId,
      proposal_template_id: input.proposal_template_id,
      operador_id: user.id,
      status: 'rascunho',
      escopo_final: input.escopo_final,
      escopo_tipo: input.escopo_tipo,
      prazo_meses: input.prazo_meses,
      valor_adesao: input.valor_adesao,
      num_parcelas: input.num_parcelas,
      valor_parcela: input.valor_parcela,
      data_inicio_contrato: input.data_inicio_contrato,
      magic_link_token,
      magic_link_expira_em,
    })
    .select('id')
    .single()

  if (e3 || !proposta) return { ok: false, erro: `Erro ao criar proposta: ${e3?.message}` }

  // 6) Auditoria
  await admin.from('audit_logs').insert({
    user_id: user.id,
    acao: 'criar',
    entidade: 'proposals',
    entidade_id: proposta.id,
    depois: { numero, client_id: clientId, status: 'rascunho' },
  })

  const magicUrl = magic_link_token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/c/${magic_link_token}`
    : undefined

  return { ok: true, proposta_id: proposta.id, magic_link: magicUrl }
}

export async function criarPropostaERedirecionar(input: NovaPropostaInput) {
  const r = await criarProposta(input)
  if (r.ok && r.proposta_id) {
    redirect(`/propostas/${r.proposta_id}`)
  }
  return r
}
