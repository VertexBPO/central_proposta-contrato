import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service_role — BYPASS RLS.
 * USAR APENAS em API Routes / Server Actions de confiança.
 * NUNCA expor no client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
