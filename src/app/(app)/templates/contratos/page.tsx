import { createClient } from '@/lib/supabase/server'
import { ContractTemplate, CustomPlaceholder } from '@/lib/db/types'
import { TemplatesContratosClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TemplatesContratosPage() {
  const supabase = await createClient()
  const [{ data }, { data: customs }] = await Promise.all([
    supabase.from('contract_templates').select('*').order('nome'),
    supabase.from('custom_placeholders').select('*').eq('categoria', 'contrato').order('nome'),
  ])

  const templates = (data ?? []) as ContractTemplate[]
  const customPlaceholders = (customs ?? []) as CustomPlaceholder[]

  return <TemplatesContratosClient templates={templates} customPlaceholders={customPlaceholders} />
}
