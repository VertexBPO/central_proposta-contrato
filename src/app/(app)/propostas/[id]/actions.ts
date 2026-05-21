'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FormaAceite, StatusProposta } from '@/lib/db/types'

interface Resultado {
  ok: boolean
  erro?: string
  magic_link?: string
}

async function getUserOrErr() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('users')
    .select('papel, ativo')
    .eq('id', user.id)
    .maybeSingle()
  if (!perfil || !perfil.ativo) return null
  return { id: user.id, papel: perfil.papel as 'admin' | 'operador' }
}

async function logAudit(
  user_id: string,
  acao: string,
  entidade_id: string,
  antes: unknown,
  depois: unknown,
  justificativa?: string
) {
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    user_id,
    acao,
    entidade: 'proposals',
    entidade_id,
    antes: antes as object,
    depois: depois as object,
    justificativa,
  })
}

async function mudarStatus(
  propostaId: string,
  novoStatus: StatusProposta,
  extras: Record<string, unknown> = {},
  acao: string,
  justificativa?: string
): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const admin = createAdminClient()
  const { data: antes } = await admin
    .from('proposals')
    .select('status, aprovador_id, motivo_perdida, motivo_devolucao, motivo_cancelamento, forma_aceite, aceito_em')
    .eq('id', propostaId)
    .maybeSingle()

  if (!antes) return { ok: false, erro: 'Proposta não encontrada.' }

  const { error } = await admin
    .from('proposals')
    .update({ status: novoStatus, ...extras })
    .eq('id', propostaId)
  if (error) return { ok: false, erro: error.message }

  await logAudit(user.id, acao, propostaId, antes, { status: novoStatus, ...extras }, justificativa)
  revalidatePath(`/propostas/${propostaId}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function submeterParaAprovacao(id: string): Promise<Resultado> {
  return mudarStatus(id, 'aguardando_aprovacao', {}, 'submeter')
}

export async function aprovarProposta(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode aprovar.' }
  return mudarStatus(id, 'aprovada', { aprovador_id: user.id }, 'aprovar')
}

export async function devolverProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode devolver.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo da devolução.' }
  return mudarStatus(id, 'devolvida', { motivo_devolucao: motivo.trim() }, 'devolver', motivo.trim())
}

export async function rejeitarProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode rejeitar.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo da rejeição.' }
  return mudarStatus(id, 'rejeitada', { motivo_devolucao: motivo.trim() }, 'rejeitar', motivo.trim())
}

export async function marcarFechada(
  id: string,
  forma: FormaAceite,
  descricao?: string
): Promise<Resultado> {
  return mudarStatus(
    id,
    'fechada',
    { forma_aceite: forma, forma_aceite_descricao: descricao ?? null, aceito_em: new Date().toISOString() },
    'marcar_fechada'
  )
}

export async function marcarPerdida(id: string, motivo: string): Promise<Resultado> {
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo.' }
  return mudarStatus(id, 'perdida', { motivo_perdida: motivo.trim() }, 'marcar_perdida', motivo.trim())
}

export async function cancelarProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode cancelar.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo do cancelamento.' }
  return mudarStatus(id, 'cancelada', { motivo_cancelamento: motivo.trim() }, 'cancelar', motivo.trim())
}

export async function gerarMagicLink(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }
  const admin = createAdminClient()
  const token = randomUUID()
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { error } = await admin
    .from('proposals')
    .update({ magic_link_token: token, magic_link_expira_em: expira })
    .eq('id', id)
  if (error) return { ok: false, erro: error.message }
  await logAudit(user.id, 'gerar_magic_link', id, null, { expira_em: expira })
  revalidatePath(`/propostas/${id}`)
  return {
    ok: true,
    magic_link: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/c/${token}`,
  }
}
