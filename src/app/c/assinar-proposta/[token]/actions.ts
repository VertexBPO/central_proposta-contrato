'use server'

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
  return data as { id: string; status: string }
}

// Confirma a assinatura do cliente na proposta (disparado pelo widget embedded).
// A confirmação autoritativa também chega pelo webhook (idempotente).
export async function confirmarAssinaturaClienteProposta(token: string): Promise<Resultado> {
  const prop = await carregarPropostaAtiva(token)
  if (!prop) return { ok: false, erro: 'Link inválido ou expirado.' }

  const admin = createAdminClient()
  await admin
    .from('proposals')
    .update({ status: 'proposta_assinada', cliente_assinou_em: new Date().toISOString() })
    .eq('id', prop.id)

  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'cliente_assinou_proposta',
    entidade: 'proposals',
    entidade_id: prop.id,
    depois: { status: 'proposta_assinada' },
  })

  return { ok: true }
}
