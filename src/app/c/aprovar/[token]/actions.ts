'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

interface Resultado {
  ok: boolean
  erro?: string
}

async function carregarPropostaAtiva(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('proposals')
    .select('id, status, magic_link_expira_em')
    .eq('magic_link_token', token)
    .maybeSingle()
  if (!data) return null
  if (data.magic_link_expira_em && new Date(data.magic_link_expira_em) < new Date()) return null
  return data as { id: string; status: string; magic_link_expira_em: string | null }
}

export async function aprovarPropostaPeloCliente(token: string): Promise<Resultado> {
  const prop = await carregarPropostaAtiva(token)
  if (!prop) return { ok: false, erro: 'Link inválido ou expirado.' }

  const statusAceitos = ['aprovada', 'enviada', 'aberta']
  if (!statusAceitos.includes(prop.status)) {
    return { ok: false, erro: `Proposta não está em status pra aprovação (atual: ${prop.status}).` }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('proposals')
    .update({ status: 'aprovada_cliente', aceito_em: new Date().toISOString() })
    .eq('id', prop.id)
  if (error) return { ok: false, erro: error.message }

  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'cliente_aprovou_proposta',
    entidade: 'proposals',
    entidade_id: prop.id,
    depois: { status: 'aprovada_cliente' },
  })

  revalidatePath('/dashboard')
  return { ok: true }
}

export async function rejeitarPropostaPeloCliente(token: string, motivo: string): Promise<Resultado> {
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo da rejeição.' }

  const prop = await carregarPropostaAtiva(token)
  if (!prop) return { ok: false, erro: 'Link inválido ou expirado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('proposals')
    .update({ status: 'perdida', motivo_perdida: motivo.trim() })
    .eq('id', prop.id)
  if (error) return { ok: false, erro: error.message }

  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'cliente_rejeitou_proposta',
    entidade: 'proposals',
    entidade_id: prop.id,
    depois: { status: 'perdida', motivo_perdida: motivo.trim() },
  })

  revalidatePath('/dashboard')
  return { ok: true }
}
