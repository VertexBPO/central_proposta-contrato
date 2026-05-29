// Geração do PDF do contrato — reaproveita os dados da proposta + cadastro do cliente.
import { createAdminClient } from '@/lib/supabase/admin'
import { Client, Contractor, Proposal, ProposalTemplate, ContractTemplate } from '@/lib/db/types'
import {
  preencherDocx,
  neutralizarPageBreaksDeEstilos,
  garantirMargemSuperior,
  removerParagrafosVaziosDoDocx,
} from '@/lib/docs/gerar-com-template'
import { docxParaPdf } from '@/lib/cloudconvert/client'
import { montarValores } from '@/lib/docs/valores-placeholders'

export interface PdfContratoResultado {
  ok: boolean
  pdf?: Buffer
  numero?: string
  storagePath?: string
  cliente?: Client
  erro?: string
}

export async function gerarPdfContrato(propostaId: string): Promise<PdfContratoResultado> {
  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', propostaId).maybeSingle()
  if (!prop) return { ok: false, erro: 'Proposta não encontrada.' }
  const proposta = prop as Proposal

  const [{ data: cli }, { data: ctr }, { data: tpl }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('proposal_templates').select('*').eq('id', proposta.proposal_template_id).maybeSingle(),
  ])
  if (!cli || !ctr || !tpl) return { ok: false, erro: 'Dados incompletos: cliente, contratante ou template.' }
  const cliente = cli as Client
  const contratante = ctr as Contractor
  const template = tpl as ProposalTemplate

  const contractTemplateId = proposta.contract_template_id_override ?? template.contract_template_id
  if (!contractTemplateId) return { ok: false, erro: 'Template de contrato não vinculado.' }
  const { data: ctplRow } = await admin
    .from('contract_templates')
    .select('*')
    .eq('id', contractTemplateId)
    .maybeSingle()
  const ctpl = ctplRow as ContractTemplate | null
  if (!ctpl?.template_file_path) return { ok: false, erro: 'Template de contrato sem arquivo .docx.' }

  const valores = montarValores(proposta, cliente, contratante)

  let docx: Buffer
  try {
    docx = await preencherDocx(ctpl.template_file_path, valores)
  } catch (e) {
    return { ok: false, erro: `Falha ao preencher contrato: ${e instanceof Error ? e.message : 'erro'}` }
  }
  try { docx = await neutralizarPageBreaksDeEstilos(docx) } catch {}
  try { docx = await removerParagrafosVaziosDoDocx(docx) } catch {}
  try { docx = await garantirMargemSuperior(docx, 2098) } catch {}

  let pdf: Buffer
  try {
    pdf = await docxParaPdf(docx, `contrato-${proposta.numero}.docx`)
  } catch (e) {
    return { ok: false, erro: `Falha ao converter contrato em PDF: ${e instanceof Error ? e.message : 'erro'}` }
  }

  const storagePath = `contratos/${proposta.id}/${proposta.numero}.pdf`
  await admin.storage.from('documentos').upload(storagePath, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })

  return { ok: true, pdf, numero: proposta.numero, storagePath, cliente }
}
