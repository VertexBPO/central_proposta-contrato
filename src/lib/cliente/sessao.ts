import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_NAME = 'cpc_cli_token'
const COOKIE_MAX_AGE = 60 * 30 // 30 min

export async function setClienteSessao(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearClienteSessao() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getClienteSessao(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}

export interface PropostaCliente {
  id: string
  numero: string
  client_id: string
  status: string
  magic_link_expira_em: string
  cliente: {
    id: string
    razao_social: string | null
    cnpj: string | null
    responsavel_nome: string | null
    email: string
    telefone: string | null
    endereco_logradouro: string | null
    endereco_numero: string | null
    endereco_complemento: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_uf: string | null
    endereco_cep: string | null
  }
}

/**
 * Resolve token → proposta + cliente (server-only, usa admin client).
 * Retorna null se token inválido ou expirado.
 */
export async function carregarPropostaPorToken(token: string): Promise<PropostaCliente | null> {
  if (!token) return null
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('proposals')
    .select(`
      id,
      numero,
      client_id,
      status,
      magic_link_expira_em,
      clients (
        id, razao_social, cnpj, responsavel_nome, email, telefone,
        endereco_logradouro, endereco_numero, endereco_complemento,
        endereco_bairro, endereco_cidade, endereco_uf, endereco_cep
      )
    `)
    .eq('magic_link_token', token)
    .maybeSingle()

  if (error || !data) return null

  if (data.magic_link_expira_em && new Date(data.magic_link_expira_em) < new Date()) {
    return null
  }

  if (!data.clients || Array.isArray(data.clients) ? !data.clients.length : false) {
    return null
  }

  const cliente = Array.isArray(data.clients) ? data.clients[0] : data.clients

  return {
    id: data.id,
    numero: data.numero,
    client_id: data.client_id,
    status: data.status,
    magic_link_expira_em: data.magic_link_expira_em,
    cliente,
  }
}
