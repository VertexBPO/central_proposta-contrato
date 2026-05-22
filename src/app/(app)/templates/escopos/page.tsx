import { createClient } from '@/lib/supabase/server'
import { ScopeTemplate } from '@/lib/db/types'
import { TemplatesEscoposClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TemplatesEscoposPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('scope_templates').select('*').order('nome')
  return <TemplatesEscoposClient escopos={(data ?? []) as ScopeTemplate[]} />
}
