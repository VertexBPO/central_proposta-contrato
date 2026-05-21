import { createClient } from '@/lib/supabase/server'
import { EmailTemplate, TipoEmailTemplate } from '@/lib/db/types'
import { TemplatesEmailsClient } from './client'

export const dynamic = 'force-dynamic'

const TIPOS_ORDEM: TipoEmailTemplate[] = [
  'envio_proposta',
  'lembrete',
  'envio_contrato',
  're_aceite',
  'reabertura',
]

export default async function TemplatesEmailsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('email_templates').select('*')
  const templates = (data ?? []) as EmailTemplate[]

  // Garante que todos os tipos aparecem (mesmo que ainda não existam no banco)
  const porTipo = new Map(templates.map((t) => [t.tipo, t]))
  const lista = TIPOS_ORDEM.map((tipo) => porTipo.get(tipo) ?? { tipo, assunto: '', corpo_html: '' })

  return <TemplatesEmailsClient lista={lista as Array<EmailTemplate | { tipo: TipoEmailTemplate; assunto: string; corpo_html: string }>} />
}
