import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client, Contractor, Proposal, ContractTemplate } from '@/lib/db/types'
import { preencherDocx, extrairXmlCorpoEscopo, textoParaXmlParagrafos } from '@/lib/docs/gerar-com-template'
import { docxParaPdf } from '@/lib/cloudconvert/client'
import { montarValores } from '@/lib/docs/valores-placeholders'

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
    admin
      .from('proposal_templates')
      .select('contract_template_id')
      .eq('id', proposta.proposal_template_id)
      .maybeSingle(),
  ])

  if (!cli || !ctr || !tpl) return new NextResponse('Dados incompletos', { status: 500 })

  const cliente = cli as Client
  const contratante = ctr as Contractor

  const contractTemplateId =
    proposta.contract_template_id_override ?? (tpl as { contract_template_id: string | null }).contract_template_id
  if (!contractTemplateId) return new NextResponse('Sem template de contrato vinculado.', { status: 500 })

  const { data: ctplRow } = await admin
    .from('contract_templates')
    .select('*')
    .eq('id', contractTemplateId)
    .maybeSingle()
  if (!ctplRow) return new NextResponse('Template de contrato não encontrado', { status: 500 })

  const contrato = ctplRow as ContractTemplate
  if (!contrato.template_file_path) {
    return new NextResponse('Template de contrato sem arquivo .docx.', { status: 500 })
  }

  // Escopo: busca o template vinculado pra extrair XML rico
  let escopoXml = ''
  const { data: scp } = proposta.scope_template_id
    ? await admin.from('scope_templates').select('template_file_path').eq('id', proposta.scope_template_id).maybeSingle()
    : { data: null }
  if (scp?.template_file_path && proposta.escopo_tipo !== 'personalizado') {
    try {
      escopoXml = await extrairXmlCorpoEscopo(scp.template_file_path)
    } catch (e) {
      return new NextResponse(
        `Falha ao extrair escopo: ${e instanceof Error ? e.message : 'erro'}`,
        { status: 500 }
      )
    }
  } else {
    escopoXml = textoParaXmlParagrafos(proposta.escopo_final ?? '')
  }

  const valores = montarValores(proposta, cliente, contratante, escopoXml)

  let docxPreenchido: Buffer
  try {
    docxPreenchido = await preencherDocx(contrato.template_file_path, valores)
  } catch (e) {
    return new NextResponse(
      `Falha ao preencher contrato: ${e instanceof Error ? e.message : 'erro'}`,
      { status: 500 }
    )
  }

  let pdfBytes: Buffer
  try {
    pdfBytes = await docxParaPdf(docxPreenchido, `contrato-${proposta.numero}.docx`)
  } catch (e) {
    return new NextResponse(
      `Falha ao converter PDF: ${e instanceof Error ? e.message : 'erro'}`,
      { status: 500 }
    )
  }

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contrato-${proposta.numero}.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
