import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client, Contractor, Proposal, ContractTemplate, formatCurrency, formatDate } from '@/lib/db/types'
import { gerarPdf } from '@/lib/docs/gerar-pdf'
import { renderPlaceholders } from '@/lib/docs/render-placeholders'
import { formatCnpj, formatDocumento } from '@/lib/db/cnpj'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', id).maybeSingle()
  if (!prop) return new NextResponse('Not found', { status: 404 })

  const proposta = prop as Proposal

  const [{ data: cli }, { data: tpl }, { data: ctr }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    admin.from('proposal_templates').select('contract_template_id').eq('id', proposta.proposal_template_id).maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!cli || !tpl || !ctr) return new NextResponse('Dados incompletos', { status: 500 })

  const cliente = cli as Client
  const contratante = ctr as Contractor

  const contractTemplateId = proposta.contract_template_id_override ?? (tpl as { contract_template_id: string }).contract_template_id
  const { data: ctplRow } = await admin
    .from('contract_templates')
    .select('*')
    .eq('id', contractTemplateId)
    .maybeSingle()
  if (!ctplRow) return new NextResponse('Template de contrato não encontrado', { status: 500 })

  const contractTemplate = ctplRow as ContractTemplate

  const corpoRenderizado = renderPlaceholders(contractTemplate.corpo, {
    proposal: proposta,
    cliente,
    contratante,
  })

  const total = Number(proposta.valor_adesao) + Number(proposta.valor_parcela) * proposta.num_parcelas

  const pdfBytes = await gerarPdf({
    titulo: `Contrato Nº ${proposta.numero}`,
    numero: proposta.numero,
    conteudo: corpoRenderizado,
    cliente: {
      razao_social: cliente.razao_social,
      cnpj: formatCnpj(cliente.cnpj),
      endereco: [
        cliente.endereco_logradouro,
        cliente.endereco_numero,
        cliente.endereco_bairro,
        cliente.endereco_cidade && cliente.endereco_uf
          ? `${cliente.endereco_cidade}/${cliente.endereco_uf}`
          : '',
      ]
        .filter(Boolean)
        .join(', '),
    },
    contratante: {
      razao_social: contratante.razao_social,
      cnpj: formatDocumento(contratante.documento, contratante.tipo),
    },
    resumoComercial: [
      { label: 'Prazo', valor: `${proposta.prazo_meses} meses` },
      { label: 'Data de início', valor: formatDate(proposta.data_inicio_contrato) },
      { label: 'Valor de adesão', valor: formatCurrency(Number(proposta.valor_adesao)) },
      { label: 'Parcelas', valor: `${proposta.num_parcelas} × ${formatCurrency(Number(proposta.valor_parcela))}` },
      { label: 'Valor total', valor: formatCurrency(total) },
    ],
    dataLocal: `${contratante.endereco}, ${formatDate(proposta.data_proposta)}`,
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contrato-${proposta.numero}.pdf"`,
    },
  })
}
