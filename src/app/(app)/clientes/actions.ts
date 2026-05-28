'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Resultado {
  ok: boolean
  erro?: string
}

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('users').select('papel, ativo').eq('id', user.id).maybeSingle()
  if (!perfil || !perfil.ativo) return null
  return { userId: user.id, papel: perfil.papel as 'admin' | 'operador' }
}

export interface AtualizarClienteInput {
  razao_social: string
  cnpj: string
  email: string
  telefone: string | null
  endereco_logradouro: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
  endereco_cep: string | null
  responsavel_nome: string | null
  responsavel_cargo: string | null
  responsavel_cpf: string | null
  responsavel_email: string | null
  responsavel_endereco_logradouro: string | null
  responsavel_endereco_numero: string | null
  responsavel_endereco_complemento: string | null
  responsavel_endereco_bairro: string | null
  responsavel_endereco_cidade: string | null
  responsavel_endereco_uf: string | null
  responsavel_endereco_cep: string | null
}

export async function atualizarCliente(id: string, input: AtualizarClienteInput): Promise<Resultado> {
  const auth = await getAdmin()
  if (!auth) return { ok: false, erro: 'Sessão inválida.' }

  const admin = createAdminClient()
  const { error } = await admin.from('clients').update(input).eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/clientes/${id}`)
  revalidatePath('/clientes')
  return { ok: true }
}

export async function apagarCliente(id: string): Promise<Resultado> {
  const auth = await getAdmin()
  if (!auth || auth.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode apagar contratantes.' }

  const admin = createAdminClient()
  // Soft delete
  const { error } = await admin
    .from('clients')
    .update({ deletado_em: new Date().toISOString(), deletado_por: auth.userId })
    .eq('id', id)

  if (error) return { ok: false, erro: error.message }

  revalidatePath('/clientes')
  return { ok: true }
}
