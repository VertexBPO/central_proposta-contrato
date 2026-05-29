// Entrega final — baixa os PDFs assinados (proposta + contrato) da ClickSign e
// envia por e-mail ao cliente. Marca a proposta como contrato_assinado. Idempotente.
import { createAdminClient } from '@/lib/supabase/admin'
import { baixarPdfAssinado } from '@/lib/clicksign/client'
import { enviarEmail } from '@/lib/email/resend'
import { Proposal, Client, Contract } from '@/lib/db/types'

export interface EntregaResultado {
  ok: boolean
  jaEntregue?: boolean
  erro?: string
}

export async function entregarDocumentosAssinados(propostaId: string): Promise<EntregaResultado> {
  const admin = createAdminClient()

  const { data: propRow } = await admin.from('proposals').select('*').eq('id', propostaId).maybeSingle()
  if (!propRow) return { ok: false, erro: 'Proposta não encontrada.' }
  const proposta = propRow as Proposal
  if (proposta.status === 'contrato_assinado') return { ok: true, jaEntregue: true }

  const [{ data: cliRow }, { data: ctrRow }] = await Promise.all([
    admin.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    admin.from('contracts').select('*').eq('proposal_id', propostaId).maybeSingle(),
  ])
  const cliente = cliRow as Client | null
  const contrato = ctrRow as Contract | null
  if (!cliente) return { ok: false, erro: 'Cliente não encontrado.' }

  // Baixa os PDFs assinados (best-effort — anexa o que conseguir).
  const anexos: Array<{ filename: string; content: Buffer }> = []
  if (proposta.clicksign_doc_id) {
    const p = await baixarPdfAssinado(proposta.clicksign_doc_id)
    if (p.ok && p.buffer) {
      anexos.push({ filename: `proposta-${proposta.numero}-assinada.pdf`, content: p.buffer })
      const path = `propostas/${propostaId}/${proposta.numero}-assinada.pdf`
      await admin.storage.from('documentos').upload(path, p.buffer, { contentType: 'application/pdf', upsert: true })
      await admin.from('proposals').update({ pdf_assinado_path: path }).eq('id', propostaId)
    }
  }
  if (contrato?.clicksign_doc_id) {
    const c = await baixarPdfAssinado(contrato.clicksign_doc_id)
    if (c.ok && c.buffer) {
      anexos.push({ filename: `contrato-${proposta.numero}-assinado.pdf`, content: c.buffer })
      const path = `contratos/${propostaId}/${proposta.numero}-assinado.pdf`
      await admin.storage.from('documentos').upload(path, c.buffer, { contentType: 'application/pdf', upsert: true })
      await admin.from('contracts').update({ pdf_assinado_path: path, assinado_em: new Date().toISOString() }).eq('id', contrato.id)
    }
  }

  const para = cliente.responsavel_email ?? cliente.email
  const { data: par } = await admin.from('parameters').select('email_vertex').eq('id', 1).maybeSingle()
  const emailVertex = (par as { email_vertex: string } | null)?.email_vertex
  const envio = await enviarEmail({
    para,
    bcc: emailVertex, // Vertex recebe cópia do fechamento
    assunto: `Documentos assinados — ${proposta.numero} — Vertex BPO`,
    corpoHtml: `<p>Olá, ${cliente.responsavel_nome ?? cliente.razao_social}!</p>
<p>Está tudo assinado. Seguem em anexo a <strong>proposta</strong> e o <strong>contrato ${proposta.numero}</strong> assinados.</p>
<p>Obrigado por confiar na Vertex BPO.</p>`,
    anexos: anexos.length ? anexos : undefined,
  })

  await admin.from('proposals').update({ status: 'contrato_assinado' }).eq('id', propostaId)
  await admin.from('email_logs').insert({
    proposal_id: propostaId,
    tipo: 'envio_contrato',
    destinatario: para,
    assunto: `Documentos assinados — ${proposta.numero} — Vertex BPO`,
    status: envio.ok ? 'enviado' : 'falha',
    resend_id: envio.id ?? null,
    bounce_motivo: envio.erro ?? null,
  })
  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'contrato_assinado_entregue',
    entidade: 'proposals',
    entidade_id: propostaId,
    depois: { status: 'contrato_assinado', anexos: anexos.map((a) => a.filename) },
  })

  if (!envio.ok) return { ok: false, erro: envio.erro ?? 'Falha ao enviar e-mail final.' }
  return { ok: true }
}
