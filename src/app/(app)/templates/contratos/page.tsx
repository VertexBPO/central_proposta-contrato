import { createClient } from '@/lib/supabase/server'
import { ContractTemplate } from '@/lib/db/types'
import { TemplatesContratosClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TemplatesContratosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contract_templates')
    .select('*')
    .order('nome')

  const templates = (data ?? []) as ContractTemplate[]

  return <TemplatesContratosClient templates={templates} />
}
