import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', id).maybeSingle()
  if (!prop) return new NextResponse('Not found', { status: 404 })
  const proposta = prop as Proposal

  const [{ data: cli }, { data: ctr }, { data: tpl }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('proposal_templates').select('*').eq('id', proposta.proposal_template_id).maybeSingle(),
  ])

  if (!cli || !ctr || !tpl) {
    return new NextResponse('Dados incompletos: cliente, contratante ou template ausente.', { status: 500 })
  }

  const cliente = cli as Client
  const contratante = ctr as Contractor
  const template = tpl as ProposalTemplate

  if (!template.template_file_path) {
    return new NextResponse('Template de proposta sem arquivo .docx. Suba o arquivo no cadastro.', { status: 500 })
  }

  // O template já tem o escopo embutido — passa string vazia (placeholder {{escopo}} fica vazio se ainda existir)
  const valores = montarValores(proposta, cliente, contratante)

  let docxPreenchido: Buffer
  try {
    docxPreenchido = await preencherDocx(template.template_file_path, valores)
  } catch (e) {
    return new NextResponse(
      `Falha ao preencher .docx: ${e instanceof Error ? e.message : 'erro'}`,
      { status: 500 }
    )
  }

  try {
    docxPreenchido = await neutralizarPageBreaksDeEstilos(docxPreenchido)
  } catch {}

  try {
    docxPreenchido = await removerParagrafosVaziosDoDocx(docxPreenchido)
  } catch {}

  try {
    docxPreenchido = await garantirMargemSuperior(docxPreenchido, 2098)
  } catch {}

  try {
    docxPreenchido = await aplicarAlphaNasWatermarks(docxPreenchido)
  } catch {}

  let pdfBytes: Buffer
  try {
    pdfBytes = await docxParaPdf(docxPreenchido, `proposta-${proposta.numero}.docx`)
  } catch (e) {
    return new NextResponse(
      `Falha ao converter PDF: ${e instanceof Error ? e.message : 'erro'}`,
      { status: 500 }
    )
  }

  const storagePath = `propostas/${proposta.id}/${proposta.numero}.pdf`
  await admin.storage.from('documentos').upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  })
  await admin.from('proposals').update({ pdf_storage_path: storagePath }).eq('id', proposta.id)

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposta-${proposta.numero}.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
