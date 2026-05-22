import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client, Contractor, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
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
  const [{ data: cli }, { data: ctr }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    proposta.contractor_id
      ? admin.from('contractors').select('*').eq('id', proposta.contractor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!cli || !ctr) return new NextResponse('Dados incompletos: configure cliente e contratante.', { status: 500 })

  const cliente = cli as Client
  const contratante = ctr as Contractor

  const escopoRenderizado = renderPlaceholders(proposta.escopo_final, {
    proposal: proposta,
    cliente,
    contratante,
  })

  const total = Number(proposta.valor_adesao) + Number(proposta.valor_parcela) * proposta.num_parcelas

  const pdfBytes = await gerarPdf({
    titulo: `Proposta Comercial Nº ${proposta.numero}`,
    numero: proposta.numero,
    conteudo: escopoRenderizado,
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

  if (!proposta.pdf_storage_path) {
    const path = `propostas/${proposta.id}/${proposta.numero}.pdf`
    const { error: uploadErr } = await admin.storage
      .from('documentos')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (!uploadErr) {
      await admin.from('proposals').update({ pdf_storage_path: path }).eq('id', proposta.id)
    }
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposta-${proposta.numero}.pdf"`,
    },
  })
}
