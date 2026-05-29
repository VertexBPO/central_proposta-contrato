// Geração do PDF da proposta — helper compartilhado entre a rota /api/propostas/[id]/pdf
// e a action de envio para assinatura. Mantém o pipeline em um só lugar.
import { createAdminClient } from '@/lib/supabase/admin'
import { Client, Contractor, Proposal, ProposalTemplate } from '@/lib/db/types'
import {
  preencherDocx,
  neutralizarPageBreaksDeEstilos,
  garantirMargemSuperior,
  removerParagrafosVaziosDoDocx,
} from '@/lib/docs/gerar-com-template'
import { docxParaPdf } from '@/lib/cloudconvert/client'
import { montarValores } from '@/lib/docs/valores-placeholders'
import { aplicarAlphaNasWatermarks } from '@/lib/docs/watermark-alpha'

export interface PdfPropostaResultado {
  ok: boolean
  pdf?: Buffer
  numero?: string
  storagePath?: string
  erro?: string
}

// Gera o PDF da proposta, salva no Storage e retorna o buffer.
export async function gerarPdfProposta(id: string): Promise<PdfPropostaResultado> {
  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', id).maybeSingle()
  if (!prop) return { ok: false, erro: 'Proposta não encontrada.' }
  const proposta = prop as Proposal

  const [{ data: cli }, { data: ctr }, { data: tpl }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('proposal_templates').select('*').eq('id', proposta.proposal_template_id).maybeSingle(),
  ])

  if (!cli || !ctr || !tpl) {
    return { ok: false, erro: 'Dados incompletos: cliente, contratante ou template ausente.' }
  }
  const cliente = cli as Client
  const contratante = ctr as Contractor
  const template = tpl as ProposalTemplate

  if (!template.template_file_path) {
    return { ok: false, erro: 'Template de proposta sem arquivo .docx.' }
  }

  const valores = montarValores(proposta, cliente, contratante)

  let docx: Buffer
  try {
    docx = await preencherDocx(template.template_file_path, valores)
  } catch (e) {
    return { ok: false, erro: `Falha ao preencher .docx: ${e instanceof Error ? e.message : 'erro'}` }
  }

  try { docx = await neutralizarPageBreaksDeEstilos(docx) } catch {}
  try { docx = await removerParagrafosVaziosDoDocx(docx) } catch {}
  try { docx = await garantirMargemSuperior(docx, 2098) } catch {}
  try { docx = await aplicarAlphaNasWatermarks(docx) } catch {}

  let pdf: Buffer
  try {
    pdf = await docxParaPdf(docx, `proposta-${proposta.numero}.docx`)
  } catch (e) {
    return { ok: false, erro: `Falha ao converter PDF: ${e instanceof Error ? e.message : 'erro'}` }
  }

  const storagePath = `propostas/${proposta.id}/${proposta.numero}.pdf`
  await admin.storage.from('documentos').upload(storagePath, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  await admin.from('proposals').update({ pdf_storage_path: storagePath }).eq('id', proposta.id)

  return { ok: true, pdf, numero: proposta.numero, storagePath }
}
