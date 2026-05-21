'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FormaAceite, StatusProposta, Client, Parameters, Proposal, ContractTemplate, EmailTemplate, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'
import { gerarPdf } from '@/lib/docs/gerar-pdf'
import { renderPlaceholders } from '@/lib/docs/render-placeholders'
import { enviarEmail } from '@/lib/email/resend'
import { enviarParaAssinatura } from '@/lib/zapsign/client'

interface Resultado {
  ok: boolean
  erro?: string
  magic_link?: string
  contrato_url?: string
}

async function getUserOrErr() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('users')
    .select('papel, ativo')
    .eq('id', user.id)
    .maybeSingle()
  if (!perfil || !perfil.ativo) return null
  return { id: user.id, papel: perfil.papel as 'admin' | 'operador' }
}

async function logAudit(
  user_id: string,
  acao: string,
  entidade_id: string,
  antes: unknown,
  depois: unknown,
  justificativa?: string
) {
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    user_id,
    acao,
    entidade: 'proposals',
    entidade_id,
    antes: antes as object,
    depois: depois as object,
    justificativa,
  })
}

async function mudarStatus(
  propostaId: string,
  novoStatus: StatusProposta,
  extras: Record<string, unknown> = {},
  acao: string,
  justificativa?: string
): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const admin = createAdminClient()
  const { data: antes } = await admin
    .from('proposals')
    .select('status, aprovador_id, motivo_perdida, motivo_devolucao, motivo_cancelamento, forma_aceite, aceito_em')
    .eq('id', propostaId)
    .maybeSingle()

  if (!antes) return { ok: false, erro: 'Proposta não encontrada.' }

  const { error } = await admin
    .from('proposals')
    .update({ status: novoStatus, ...extras })
    .eq('id', propostaId)
  if (error) return { ok: false, erro: error.message }

  await logAudit(user.id, acao, propostaId, antes, { status: novoStatus, ...extras }, justificativa)
  revalidatePath(`/propostas/${propostaId}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function submeterParaAprovacao(id: string): Promise<Resultado> {
  return mudarStatus(id, 'aguardando_aprovacao', {}, 'submeter')
}

export async function aprovarProposta(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode aprovar.' }
  return mudarStatus(id, 'aprovada', { aprovador_id: user.id }, 'aprovar')
}

export async function devolverProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode devolver.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo da devolução.' }
  return mudarStatus(id, 'devolvida', { motivo_devolucao: motivo.trim() }, 'devolver', motivo.trim())
}

export async function rejeitarProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode rejeitar.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo da rejeição.' }
  return mudarStatus(id, 'rejeitada', { motivo_devolucao: motivo.trim() }, 'rejeitar', motivo.trim())
}

export async function marcarFechada(
  id: string,
  forma: FormaAceite,
  descricao?: string
): Promise<Resultado> {
  return mudarStatus(
    id,
    'fechada',
    { forma_aceite: forma, forma_aceite_descricao: descricao ?? null, aceito_em: new Date().toISOString() },
    'marcar_fechada'
  )
}

export async function marcarPerdida(id: string, motivo: string): Promise<Resultado> {
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo.' }
  return mudarStatus(id, 'perdida', { motivo_perdida: motivo.trim() }, 'marcar_perdida', motivo.trim())
}

export async function cancelarProposta(id: string, motivo: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user || user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode cancelar.' }
  if (!motivo.trim()) return { ok: false, erro: 'Informe o motivo do cancelamento.' }
  return mudarStatus(id, 'cancelada', { motivo_cancelamento: motivo.trim() }, 'cancelar', motivo.trim())
}

async function carregarPropostaCompleta(id: string) {
  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', id).maybeSingle()
  if (!prop) return null
  const proposta = prop as Proposal
  const [{ data: cli }, { data: par }, { data: tpl }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    admin.from('parameters').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('proposal_templates')
      .select('contract_template_id')
      .eq('id', proposta.proposal_template_id)
      .maybeSingle(),
  ])
  if (!cli || !par || !tpl) return null
  return {
    proposta,
    cliente: cli as Client,
    parametros: par as Parameters,
    contractTemplateId: (proposta.contract_template_id_override ?? (tpl as { contract_template_id: string }).contract_template_id) as string,
  }
}

function corpoEnderecoCliente(c: Client) {
  return [
    c.endereco_logradouro,
    c.endereco_numero,
    c.endereco_bairro,
    c.endereco_cidade && c.endereco_uf ? `${c.endereco_cidade}/${c.endereco_uf}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

export async function enviarProposta(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const dados = await carregarPropostaCompleta(id)
  if (!dados) return { ok: false, erro: 'Proposta não encontrada.' }
  const { proposta, cliente, parametros } = dados

  if (proposta.status !== 'aprovada') {
    return { ok: false, erro: 'A proposta precisa estar aprovada para envio.' }
  }

  // 1) Gerar PDF
  const total = Number(proposta.valor_adesao) + Number(proposta.valor_parcela) * proposta.num_parcelas
  const escopoRenderizado = renderPlaceholders(proposta.escopo_final, {
    proposal: proposta,
    cliente,
    contratante: {
      razao_social: parametros.contratante_razao_social,
      cnpj: parametros.contratante_cnpj,
      endereco: parametros.contratante_endereco,
    },
  })
  const pdf = await gerarPdf({
    titulo: `Proposta Comercial Nº ${proposta.numero}`,
    numero: proposta.numero,
    conteudo: escopoRenderizado,
    cliente: {
      razao_social: cliente.razao_social,
      cnpj: formatCnpj(cliente.cnpj),
      endereco: corpoEnderecoCliente(cliente),
    },
    contratante: { razao_social: parametros.contratante_razao_social, cnpj: parametros.contratante_cnpj },
    resumoComercial: [
      { label: 'Prazo', valor: `${proposta.prazo_meses} meses` },
      { label: 'Data de início', valor: formatDate(proposta.data_inicio_contrato) },
      { label: 'Valor de adesão', valor: formatCurrency(Number(proposta.valor_adesao)) },
      { label: 'Parcelas', valor: `${proposta.num_parcelas} × ${formatCurrency(Number(proposta.valor_parcela))}` },
      { label: 'Valor total', valor: formatCurrency(total) },
    ],
    dataLocal: `Vila Velha, ES, ${formatDate(proposta.data_proposta)}`,
  })

  const admin = createAdminClient()

  // 2) Salva PDF no storage
  const path = `propostas/${proposta.id}/${proposta.numero}.pdf`
  await admin.storage.from('documentos').upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  await admin.from('proposals').update({ pdf_storage_path: path }).eq('id', proposta.id)

  // 3) Pega template de email
  const { data: emTpl } = await admin
    .from('email_templates')
    .select('*')
    .eq('tipo', 'envio_proposta')
    .maybeSingle()

  const tpl = (emTpl as EmailTemplate | null) ?? {
    assunto: `Sua proposta ${proposta.numero} — Vertex BPO`,
    corpo_html: `<p>Olá, ${cliente.responsavel_nome ?? cliente.razao_social}!</p><p>Segue em anexo a proposta {{numero}}.</p>`,
  }

  const assunto = renderPlaceholders(tpl.assunto, {
    proposal: proposta,
    cliente,
    contratante: {
      razao_social: parametros.contratante_razao_social,
      cnpj: parametros.contratante_cnpj,
      endereco: parametros.contratante_endereco,
    },
  })
  const corpo = renderPlaceholders(tpl.corpo_html, {
    proposal: proposta,
    cliente,
    contratante: {
      razao_social: parametros.contratante_razao_social,
      cnpj: parametros.contratante_cnpj,
      endereco: parametros.contratante_endereco,
    },
  })

  // 4) Envia (stub ou real)
  const envio = await enviarEmail({
    para: cliente.email,
    bcc: parametros.email_vertex,
    assunto,
    corpoHtml: corpo,
    anexos: [{ filename: `proposta-${proposta.numero}.pdf`, content: Buffer.from(pdf) }],
  })

  // 5) Loga
  await admin.from('email_logs').insert({
    proposal_id: proposta.id,
    tipo: 'envio_proposta',
    destinatario: cliente.email,
    assunto,
    status: envio.ok ? 'enviado' : 'falha',
    resend_id: envio.id ?? null,
    bounce_motivo: envio.erro ?? null,
  })

  if (!envio.ok) return { ok: false, erro: envio.erro ?? 'Falha ao enviar.' }

  // 6) Atualiza status
  await mudarStatus(id, 'enviada', {}, 'enviar')
  revalidatePath(`/propostas/${id}`)
  return { ok: true }
}

export async function enviarContratoParaAssinatura(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const dados = await carregarPropostaCompleta(id)
  if (!dados) return { ok: false, erro: 'Proposta não encontrada.' }
  const { proposta, cliente, parametros, contractTemplateId } = dados

  if (proposta.status !== 'fechada') {
    return { ok: false, erro: 'A proposta precisa estar fechada para gerar o contrato.' }
  }

  const admin = createAdminClient()
  const { data: ctplRow } = await admin
    .from('contract_templates')
    .select('*')
    .eq('id', contractTemplateId)
    .maybeSingle()
  if (!ctplRow) return { ok: false, erro: 'Template de contrato não configurado.' }
  const ctpl = ctplRow as ContractTemplate

  // 1) Renderiza corpo + gera PDF
  const corpoRenderizado = renderPlaceholders(ctpl.corpo, {
    proposal: proposta,
    cliente,
    contratante: {
      razao_social: parametros.contratante_razao_social,
      cnpj: parametros.contratante_cnpj,
      endereco: parametros.contratante_endereco,
    },
  })
  const total = Number(proposta.valor_adesao) + Number(proposta.valor_parcela) * proposta.num_parcelas
  const pdf = await gerarPdf({
    titulo: `Contrato Nº ${proposta.numero}`,
    numero: proposta.numero,
    conteudo: corpoRenderizado,
    cliente: {
      razao_social: cliente.razao_social,
      cnpj: formatCnpj(cliente.cnpj),
      endereco: corpoEnderecoCliente(cliente),
    },
    contratante: { razao_social: parametros.contratante_razao_social, cnpj: parametros.contratante_cnpj },
    resumoComercial: [
      { label: 'Prazo', valor: `${proposta.prazo_meses} meses` },
      { label: 'Data de início', valor: formatDate(proposta.data_inicio_contrato) },
      { label: 'Valor de adesão', valor: formatCurrency(Number(proposta.valor_adesao)) },
      { label: 'Parcelas', valor: `${proposta.num_parcelas} × ${formatCurrency(Number(proposta.valor_parcela))}` },
      { label: 'Valor total', valor: formatCurrency(total) },
    ],
    dataLocal: `Vila Velha, ES, ${formatDate(new Date().toISOString().slice(0, 10))}`,
  })

  // 2) Salva no Storage
  const path = `contratos/${proposta.id}/${proposta.numero}.pdf`
  await admin.storage.from('documentos').upload(path, pdf, { contentType: 'application/pdf', upsert: true })

  // 3) Envia para ZapSign (stub se sem token)
  const pdfBase64 = Buffer.from(pdf).toString('base64')
  const zap = await enviarParaAssinatura({
    nome: `Contrato ${proposta.numero}`,
    pdfBase64,
    signatarioNome: cliente.responsavel_nome ?? cliente.razao_social,
    signatarioEmail: cliente.email,
  })

  if (!zap.ok) return { ok: false, erro: zap.erro ?? 'Falha ao enviar para assinatura.' }

  // 4) Cria registro contracts
  const { error: contractErr } = await admin.from('contracts').insert({
    proposal_id: proposta.id,
    numero: proposta.numero,
    pdf_storage_path: path,
    zapsign_doc_id: zap.doc_id ?? null,
    zapsign_url: zap.url_signatario ?? null,
    enviado_zapsign_em: new Date().toISOString(),
    assinatura_url: zap.url_signatario ?? null,
  })
  if (contractErr) return { ok: false, erro: `Erro ao salvar contrato: ${contractErr.message}` }

  // 5) Atualiza proposta
  await mudarStatus(id, 'contrato_gerado', {}, 'gerar_contrato')

  return { ok: true, contrato_url: zap.url_signatario }
}

export async function gerarMagicLink(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }
  const admin = createAdminClient()
  const token = randomUUID()
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { error } = await admin
    .from('proposals')
    .update({ magic_link_token: token, magic_link_expira_em: expira })
    .eq('id', id)
  if (error) return { ok: false, erro: error.message }
  await logAudit(user.id, 'gerar_magic_link', id, null, { expira_em: expira })
  revalidatePath(`/propostas/${id}`)
  return {
    ok: true,
    magic_link: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/c/${token}`,
  }
}
