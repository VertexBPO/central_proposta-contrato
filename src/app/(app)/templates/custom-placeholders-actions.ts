'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CustomPlaceholderCategoria } from '@/lib/db/types'

interface Resultado {
  ok: boolean
  erro?: string
}

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('users')
    .select('papel, ativo')
    .eq('id', user.id)
    .maybeSingle()
  if (!perfil || !perfil.ativo) return null
  if (perfil.papel !== 'admin') return null
  return user.id
}

function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function criarCustomPlaceholder(input: {
  categoria: CustomPlaceholderCategoria
  nome: string
  descricao: string
}): Promise<Resultado> {
  const userId = await checkAdmin()
  if (!userId) return { ok: false, erro: 'Apenas admin pode criar placeholders.' }

  const nomeSlug = slugify(input.nome)
  if (!nomeSlug) return { ok: false, erro: 'Nome inválido.' }
  if (!input.descricao.trim()) return { ok: false, erro: 'Informe a descrição.' }

  const admin = createAdminClient()
  const { error } = await admin.from('custom_placeholders').insert({
    categoria: input.categoria,
    nome: nomeSlug,
    descricao: input.descricao.trim(),
  })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, erro: `Já existe um placeholder "${nomeSlug}" nessa categoria.` }
    }
    return { ok: false, erro: error.message }
  }

  revalidatePath('/templates/propostas')
  revalidatePath('/templates/contratos')
  return { ok: true }
}

export async function editarCustomPlaceholder(
  id: string,
  input: { nome: string; descricao: string; ativo: boolean },
): Promise<Resultado> {
  const userId = await checkAdmin()
  if (!userId) return { ok: false, erro: 'Apenas admin.' }

  const nomeSlug = slugify(input.nome)
  if (!nomeSlug) return { ok: false, erro: 'Nome inválido.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('custom_placeholders')
    .update({ nome: nomeSlug, descricao: input.descricao.trim(), ativo: input.ativo })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, erro: `Já existe placeholder "${nomeSlug}" nessa categoria.` }
    }
    return { ok: false, erro: error.message }
  }

  revalidatePath('/templates/propostas')
  revalidatePath('/templates/contratos')
  return { ok: true }
}

export async function apagarCustomPlaceholder(id: string): Promise<Resultado> {
  const userId = await checkAdmin()
  if (!userId) return { ok: false, erro: 'Apenas admin.' }

  const admin = createAdminClient()
  const { error } = await admin.from('custom_placeholders').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/templates/propostas')
  revalidatePath('/templates/contratos')
  return { ok: true }
}
