'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FormaAceite, StatusProposta, Client, Contractor, Parameters, Proposal, ContractTemplate, EmailTemplate } from '@/lib/db/types'
import { preencherDocx } from '@/lib/docs/gerar-com-template'
import { docxParaPdf } from '@/lib/cloudconvert/client'
import { montarValores } from '@/lib/docs/valores-placeholders'
import { enviarEmail } from '@/lib/email/resend'
import { enviarParaAssinatura } from '@/lib/zapsign/client'

function substituirPlaceholdersTexto(template: string, valores: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => valores[key] ?? `{{${key}}}`)
}

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
  const [{ data: cli }, { data: par }, { data: tpl }, { data: ctr }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    admin.from('parameters').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('proposal_templates')
      .select('contract_template_id')
      .eq('id', proposta.proposal_template_id)
      .maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!cli || !par || !tpl || !ctr) return null
  return {
    proposta,
    cliente: cli as Client,
    parametros: par as Parameters,
    contratante: ctr as Contractor,
    contractTemplateId: (proposta.contract_template_id_override ?? (tpl as { contract_template_id: string }).contract_template_id) as string,
  }
}


export async function enviarProposta(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const dados = await carregarPropostaCompleta(id)
  if (!dados) return { ok: false, erro: 'Proposta não encontrada.' }
  const { proposta, cliente, contratante, parametros } = dados

  if (proposta.status !== 'aprovada') {
    return { ok: false, erro: 'A proposta precisa estar aprovada para envio.' }
  }

  // 1) Carrega template da proposta e gera PDF via docxtemplater + CloudConvert
  const admin = createAdminClient()
  const { data: tpl } = await admin
    .from('proposal_templates')
    .select('template_file_path')
    .eq('id', proposta.proposal_template_id)
    .maybeSingle()
  const templatePath = (tpl as { template_file_path: string | null } | null)?.template_file_path
  if (!templatePath) {
    return { ok: false, erro: 'Template de proposta sem arquivo .docx.' }
  }

  const valores = montarValores(proposta, cliente, contratante, proposta.escopo_final ?? '')
  let pdf: Buffer
  try {
    const docx = await preencherDocx(templatePath, valores)
    pdf = await docxParaPdf(docx, `proposta-${proposta.numero}.docx`)
  } catch (e) {
    return { ok: false, erro: `Falha ao gerar PDF: ${e instanceof Error ? e.message : 'erro'}` }
  }

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

  const emailTpl = (emTpl as EmailTemplate | null) ?? {
    assunto: `Sua proposta ${proposta.numero} — Vertex BPO`,
    corpo_html: `<p>Olá, ${cliente.responsavel_nome ?? cliente.razao_social}!</p><p>Segue em anexo a proposta {{numero}}.</p>`,
  }

  const assunto = substituirPlaceholdersTexto(emailTpl.assunto, valores)
  const corpo = substituirPlaceholdersTexto(emailTpl.corpo_html, valores)

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
  const { proposta, cliente, contratante, contractTemplateId } = dados

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
  if (!ctpl.template_file_path) return { ok: false, erro: 'Template de contrato sem arquivo .docx.' }

  // Gera PDF via docxtemplater + CloudConvert
  const valores = montarValores(proposta, cliente, contratante, proposta.escopo_final ?? '')
  let pdf: Buffer
  try {
    const docx = await preencherDocx(ctpl.template_file_path, valores)
    pdf = await docxParaPdf(docx, `contrato-${proposta.numero}.docx`)
  } catch (e) {
    return { ok: false, erro: `Falha ao gerar PDF do contrato: ${e instanceof Error ? e.message : 'erro'}` }
  }

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

interface AtualizarPropostaInput {
  contractor_id: string
  proposal_template_id: string
  scope_template_id: string | null
  escopo_tipo: 'padrao' | 'personalizado'
  escopo_final: string
  prazo_meses: number
  valor_adesao: number
  num_parcelas: number
  valor_parcela: number
  data_inicio_contrato: string
}

export async function atualizarProposta(id: string, input: AtualizarPropostaInput): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }

  const admin = createAdminClient()
  const { data: prop } = await admin
    .from('proposals')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!prop) return { ok: false, erro: 'Proposta não encontrada.' }
  if (!['rascunho', 'devolvida'].includes(prop.status)) {
    return { ok: false, erro: `Não é possível editar proposta no status "${prop.status}". Só rascunho ou devolvida.` }
  }

  const { error } = await admin
    .from('proposals')
    .update({
      contractor_id: input.contractor_id,
      proposal_template_id: input.proposal_template_id,
      scope_template_id: input.scope_template_id,
      escopo_tipo: input.escopo_tipo,
      escopo_final: input.escopo_final,
      prazo_meses: input.prazo_meses,
      valor_adesao: input.valor_adesao,
      num_parcelas: input.num_parcelas,
      valor_parcela: input.valor_parcela,
      data_inicio_contrato: input.data_inicio_contrato,
    })
    .eq('id', id)

  if (error) return { ok: false, erro: error.message }

  await logAudit(user.id, 'editar', id, null, input)
  revalidatePath(`/propostas/${id}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deletarProposta(id: string): Promise<Resultado> {
  const user = await getUserOrErr()
  if (!user) return { ok: false, erro: 'Sessão inválida.' }
  if (user.papel !== 'admin') return { ok: false, erro: 'Apenas admin pode deletar propostas.' }

  const admin = createAdminClient()

  // Pega PDF cacheado pra limpar do Storage depois
  const { data: prop } = await admin
    .from('proposals')
    .select('pdf_storage_path, numero')
    .eq('id', id)
    .maybeSingle()
  if (!prop) return { ok: false, erro: 'Proposta não encontrada.' }

  const { error } = await admin.from('proposals').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      return { ok: false, erro: 'Proposta tem contrato gerado vinculado. Cancele o contrato antes de apagar.' }
    }
    return { ok: false, erro: error.message }
  }

  // Limpa PDF cacheado (best-effort, não bloqueia se falhar)
  if (prop.pdf_storage_path) {
    await admin.storage.from('documentos').remove([prop.pdf_storage_path])
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
