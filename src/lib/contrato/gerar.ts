// Geração + envio do contrato para assinatura (ClickSign), e notificação da Vertex.
// Chamado tanto pelo cadastro do cliente (fluxo automático) quanto por ação manual do admin.
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarPdfContrato } from '@/lib/docs/gerar-pdf-contrato'
import { criarDocumentoAssinatura, vertexSignatario } from '@/lib/clicksign/client'
import { enviarEmail } from '@/lib/email/resend'

export interface GerarContratoResultado {
  ok: boolean
  vertexKey?: string // request_signature_key da Vertex (admin assina embedded)
  erro?: string
}

// Gera o contrato, cria o documento ClickSign (Vertex 1º, cliente 2º) e notifica a Vertex.
export async function gerarEEnviarContrato(propostaId: string): Promise<GerarContratoResultado> {
  const admin = createAdminClient()

  const pdfRes = await gerarPdfContrato(propostaId)
  if (!pdfRes.ok || !pdfRes.pdf || !pdfRes.cliente) {
    return { ok: false, erro: pdfRes.erro ?? 'Falha ao gerar o contrato.' }
  }
  const { pdf, numero, storagePath, cliente } = pdfRes

  const vertex = vertexSignatario()
  const doc = await criarDocumentoAssinatura({
    nome: `Contrato ${numero}`,
    pdfBase64: Buffer.from(pdf).toString('base64'),
    signatarios: [
      vertex,
      {
        nome: cliente.responsavel_nome ?? cliente.razao_social,
        email: cliente.responsavel_email ?? cliente.email,
        cpf: cliente.responsavel_cpf ?? undefined,
      },
    ],
    mensagem: `Assinatura do contrato ${numero} — Vertex BPO.`,
  })
  if (!doc.ok || !doc.keys) return { ok: false, erro: doc.erro ?? 'Falha ao enviar contrato para assinatura.' }

  const vertexKey = doc.keys[vertex.email.toLowerCase()] ?? null
  const clienteEmail = (cliente.responsavel_email ?? cliente.email).toLowerCase()
  const clienteKey = doc.keys[clienteEmail] ?? null

  const { error: upErr } = await admin.from('contracts').upsert(
    {
      proposal_id: propostaId,
      numero: numero!,
      pdf_storage_path: storagePath ?? null,
      clicksign_doc_id: doc.doc_id ?? null,
      assinatura_vertex_key: vertexKey,
      assinatura_cliente_key: clienteKey,
      enviado_assinatura_em: new Date().toISOString(),
    },
    { onConflict: 'proposal_id' },
  )
  if (upErr) return { ok: false, erro: `Erro ao salvar contrato: ${upErr.message}` }

  await admin.from('proposals').update({ status: 'contrato_assinatura_pendente' }).eq('id', propostaId)

  await admin.from('audit_logs').insert({
    user_id: null,
    acao: 'contrato_gerado_para_assinatura',
    entidade: 'proposals',
    entidade_id: propostaId,
    depois: { status: 'contrato_assinatura_pendente', clicksign_doc_id: doc.doc_id },
  })

  // Notifica a Vertex pra assinar (admin assina embedded na tela da proposta).
  const { data: par } = await admin.from('parameters').select('email_vertex').eq('id', 1).maybeSingle()
  const emailVertex = (par as { email_vertex: string } | null)?.email_vertex
  if (emailVertex) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await enviarEmail({
      para: emailVertex,
      assunto: `Contrato ${numero} pronto para sua assinatura`,
      corpoHtml: `<p>O cliente preencheu o cadastro e o contrato <strong>${numero}</strong> foi gerado.</p>
<p>Acesse a proposta para assinar: <a href="${appUrl}/propostas/${propostaId}">${appUrl}/propostas/${propostaId}</a></p>`,
    })
  }

  return { ok: true, vertexKey: vertexKey ?? undefined }
}
