import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Gera próximo número de proposta no formato MMAA-DD.NN
 * Ex: 0526-21.01 = primeira proposta de 21/05/2026
 */
export async function gerarNumeroProposta(
  client: SupabaseClient,
  data: Date = new Date()
): Promise<string> {
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  const aa = String(data.getFullYear()).slice(2)
  const dd = String(data.getDate()).padStart(2, '0')
  const prefix = `${mm}${aa}-${dd}.`

  const { count } = await client
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .like('numero', `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(2, '0')
  return `${prefix}${seq}`
}
