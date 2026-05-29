import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { entregarDocumentosAssinados } from '@/lib/contrato/entrega'

export const runtime = 'nodejs'

// Webhook ClickSign (API v1).
// ClickSign assina o corpo com HMAC-SHA256 (segredo da conta) e envia no header
// "Content-Hmac" no formato "sha256=<hex>". Validamos antes de processar.
//
// Eventos relevantes: "auto_close" / "close" / "document_closed" => documento
// totalmente assinado. Marcamos o contrato como assinado e avançamos o status.

const EVENTOS_FECHAMENTO = new Set(['auto_close', 'close', 'document_closed', 'deadline_close'])

function assinaturaValida(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const esperado = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const recebido = header.replace(/^sha256=/, '').trim()
  const a = Buffer.from(esperado, 'hex')
  const b = Buffer.from(recebido, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

interface ClickSignWebhook {
  event?: { name?: string; data?: unknown }
  document?: { key?: string; status?: string }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret = process.env.CLICKSIGN_WEBHOOK_SECRET

  if (secret) {
    const ok = assinaturaValida(rawBody, req.headers.get('content-hmac'), secret)
    if (!ok) {
      console.warn('[clicksign webhook] HMAC inválido — rejeitado.')
      return new NextResponse('invalid signature', { status: 401 })
    }
  } else {
    // Sem segredo configurado não há como verificar a origem.
    // Mantemos o processamento em DEV, mas avisamos em alto e bom som.
    console.warn('[clicksign webhook] CLICKSIGN_WEBHOOK_SECRET vazio — processando SEM verificação de assinatura.')
  }

  let payload: ClickSignWebhook
  try {
    payload = JSON.parse(rawBody) as ClickSignWebhook
  } catch {
    return new NextResponse('invalid json', { status: 400 })
  }

  const evento = payload.event?.name
  const documentKey = payload.document?.key
  if (!evento || !documentKey) {
    return NextResponse.json({ ok: true, ignored: 'sem evento ou document key' })
  }

  if (!EVENTOS_FECHAMENTO.has(evento)) {
    // sign / upload / add_signer etc. — apenas reconhece.
    return NextResponse.json({ ok: true, evento, handled: false })
  }

  const admin = createAdminClient()

  // 1) É o documento da PROPOSTA?
  const { data: prop } = await admin
    .from('proposals')
    .select('id, status')
    .eq('clicksign_doc_id', documentKey)
    .maybeSingle()
  if (prop) {
    const p = prop as { id: string; status: string }
    if (p.status === 'proposta_assinatura_pendente') {
      await admin
        .from('proposals')
        .update({ status: 'proposta_assinada', cliente_assinou_em: new Date().toISOString() })
        .eq('id', p.id)
      await admin.from('audit_logs').insert({
        user_id: null,
        acao: 'proposta_assinada_clicksign',
        entidade: 'proposals',
        entidade_id: p.id,
        depois: { evento, document_key: documentKey, status: 'proposta_assinada' },
      })
      return NextResponse.json({ ok: true, tipo: 'proposta', evento, handled: true })
    }
    return NextResponse.json({ ok: true, tipo: 'proposta', evento, handled: false, motivo: `status ${p.status}` })
  }

  // 2) É o documento do CONTRATO?
  const { data: contrato } = await admin
    .from('contracts')
    .select('id, proposal_id, assinado_em')
    .eq('clicksign_doc_id', documentKey)
    .maybeSingle()
  if (!contrato) {
    console.warn('[clicksign webhook] documento não encontrado (proposta/contrato):', documentKey)
    return NextResponse.json({ ok: true, evento, handled: false, motivo: 'documento não encontrado' })
  }

  const c = contrato as { id: string; proposal_id: string; assinado_em: string | null }
  if (c.assinado_em) return NextResponse.json({ ok: true, tipo: 'contrato', evento, handled: false, motivo: 'já assinado' })

  const entrega = await entregarDocumentosAssinados(c.proposal_id)
  return NextResponse.json({ ok: true, tipo: 'contrato', evento, handled: true, entrega: entrega.ok })
}
