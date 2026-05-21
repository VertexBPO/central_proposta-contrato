'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Resultado {
  ok: boolean
  erro?: string
}

async function ensureAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('users').select('papel, ativo').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin' || !me.ativo) return null
  return user.id
}

export async function criarUsuario(input: {
  nome: string
  email: string
  papel: 'admin' | 'operador'
  senha: string
}): Promise<Resultado> {
  const adminId = await ensureAdmin()
  if (!adminId) return { ok: false, erro: 'Apenas admin pode criar usuários.' }

  if (!input.nome.trim() || !input.email.trim() || input.senha.length < 8) {
    return { ok: false, erro: 'Nome, e-mail e senha (mín 8 caracteres) são obrigatórios.' }
  }

  const admin = createAdminClient()

  // 1) Cria no auth
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.senha,
    email_confirm: true,
  })
  if (authErr || !authUser.user) return { ok: false, erro: authErr?.message ?? 'Erro ao criar usuário.' }

  // 2) Insere em public.users
  const { error: e2 } = await admin.from('users').insert({
    id: authUser.user.id,
    nome: input.nome.trim(),
    email: input.email.trim(),
    papel: input.papel,
    ativo: true,
  })
  if (e2) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return { ok: false, erro: e2.message }
  }

  await admin.from('audit_logs').insert({
    user_id: adminId,
    acao: 'criar_usuario',
    entidade: 'users',
    entidade_id: authUser.user.id,
    depois: { nome: input.nome, email: input.email, papel: input.papel },
  })

  revalidatePath('/usuarios')
  return { ok: true }
}

export async function alternarAtivo(id: string, ativo: boolean): Promise<Resultado> {
  const adminId = await ensureAdmin()
  if (!adminId) return { ok: false, erro: 'Apenas admin.' }
  if (id === adminId) return { ok: false, erro: 'Você não pode desativar sua própria conta.' }

  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ ativo }).eq('id', id)
  if (error) return { ok: false, erro: error.message }

  await admin.from('audit_logs').insert({
    user_id: adminId,
    acao: ativo ? 'reativar_usuario' : 'desativar_usuario',
    entidade: 'users',
    entidade_id: id,
    depois: { ativo },
  })

  revalidatePath('/usuarios')
  return { ok: true }
}
