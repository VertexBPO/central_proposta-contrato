'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClienteSessao, clearClienteSessao, carregarPropostaPorToken } from '@/lib/cliente/sessao'
import { onlyDigits, validateCnpj } from '@/lib/db/cnpj'

interface FormState {
  ok: boolean
  erro?: string
}

export async function salvarDadosCliente(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const token = await getClienteSessao()
  if (!token) return { ok: false, erro: 'Sessão expirada. Acesse novamente pelo link.' }

  const proposta = await carregarPropostaPorToken(token)
  if (!proposta) return { ok: false, erro: 'Link inválido ou expirado.' }

  const razao_social = String(formData.get('razao_social') ?? '').trim()
  const cnpjBruto = String(formData.get('cnpj') ?? '').trim()
  const responsavel_nome = String(formData.get('responsavel_nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const telefone = String(formData.get('telefone') ?? '').trim()
  const endereco_logradouro = String(formData.get('endereco_logradouro') ?? '').trim()
  const endereco_numero = String(formData.get('endereco_numero') ?? '').trim()
  const endereco_complemento = String(formData.get('endereco_complemento') ?? '').trim()
  const endereco_bairro = String(formData.get('endereco_bairro') ?? '').trim()
  const endereco_cidade = String(formData.get('endereco_cidade') ?? '').trim()
  const endereco_uf = String(formData.get('endereco_uf') ?? '').trim().toUpperCase()
  const endereco_cep = String(formData.get('endereco_cep') ?? '').trim()

  if (!razao_social || !cnpjBruto || !responsavel_nome || !email) {
    return { ok: false, erro: 'Preencha razão social, CNPJ, responsável e e-mail.' }
  }
  const cnpj = onlyDigits(cnpjBruto)
  if (!validateCnpj(cnpj)) return { ok: false, erro: 'CNPJ inválido.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' }

  const admin = createAdminClient()

  // 1) Update client (não troca CNPJ — vide regra 1.3.b item 29)
  const { error: e1 } = await admin
    .from('clients')
    .update({
      razao_social,
      responsavel_nome,
      email,
      telefone: telefone || null,
      endereco_logradouro: endereco_logradouro || null,
      endereco_numero: endereco_numero || null,
      endereco_complemento: endereco_complemento || null,
      endereco_bairro: endereco_bairro || null,
      endereco_cidade: endereco_cidade || null,
      endereco_uf: endereco_uf || null,
      endereco_cep: endereco_cep || null,
    })
    .eq('id', proposta.client_id)

  if (e1) return { ok: false, erro: `Não foi possível salvar: ${e1.message}` }

  // 2) Atualiza CNPJ se o cliente ainda não tinha um definido OU se for igual ao já cadastrado
  if (proposta.cliente.cnpj === null || proposta.cliente.cnpj === '' || proposta.cliente.cnpj === cnpj) {
    await admin.from('clients').update({ cnpj }).eq('id', proposta.client_id)
  }

  // 3) Invalida o token (single-use): zera token e expiração
  await admin
    .from('proposals')
    .update({
      magic_link_token: null,
      magic_link_expira_em: null,
    })
    .eq('id', proposta.id)

  // 4) Log de auditoria
  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'cliente_preencheu',
    entidade: 'clients',
    entidade_id: proposta.client_id,
    depois: { razao_social, cnpj, email },
  })

  await clearClienteSessao()
  redirect('/c/confirmado')
}
