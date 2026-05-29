'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { entregarDocumentosAssinados } from '@/lib/contrato/entrega'

interface Resultado {
  ok: boolean
  erro?: string
}

// Confirma a assinatura do cliente no contrato (disparado pelo widget embedded).
// Dispara a entrega final (e-mail com os 2 PDFs). A confirmação autoritativa também
// chega pelo webhook (idempotente — entregarDocumentosAssinados é idempotente).
export async function confirmarAssinaturaClienteContrato(token: string): Promise<Resultado> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('proposals')
    .select('id, magic_link_expira_em')
    .eq('magic_link_token', token)
    .maybeSingle()
  if (!data) return { ok: false, erro: 'Link inválido ou expirado.' }
  const prop = data as { id: string; magic_link_expira_em: string | null }
  if (prop.magic_link_expira_em && new Date(prop.magic_link_expira_em) < new Date()) {
    return { ok: false, erro: 'Link expirado.' }
  }

  const r = await entregarDocumentosAssinados(prop.id)
  if (!r.ok) return { ok: false, erro: r.erro }
  return { ok: true }
}
