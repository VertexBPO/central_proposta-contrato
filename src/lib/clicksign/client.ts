// Cliente ClickSign — API v1 (token via query string), assinatura EMBEDDED (tokenless).
// Doc: https://developers.clicksign.com/v1.0/docs/instalacao-do-widget-assinatura-sem-token
//
// Fluxo v1 multi-signatário:
//   1) POST /documents            -> cria o documento (PDF base64), sequence_enabled
//   2) POST /signers (1 por parte) -> auths: ['tokenless'] (assinatura embedded sem token)
//   3) POST /lists                 -> vincula signatário ao documento, devolve request_signature_key
//
// A ordem dos signatários (Vertex 1º, cliente 2º) é respeitada quando o documento
// é criado com sequence_enabled: true e os signatários são adicionados nessa ordem.
//
// Sem CLICKSIGN_API_TOKEN, opera em STUB (não chama a rede) — app testável local.

export interface Signatario {
  nome: string
  email: string
  cpf?: string // só dígitos ou formatado
}

export interface DocAssinaturaOpts {
  nome: string // sem extensão; vira "/<nome>.pdf"
  pdfBase64: string // base64 puro (sem prefixo data:)
  signatarios: Signatario[] // ordem = ordem de assinatura
  deadlineDias?: number // default 30
  mensagem?: string
}

export interface DocAssinaturaResultado {
  ok: boolean
  doc_id?: string // document key
  keys?: Record<string, string> // email (lowercase) -> request_signature_key
  erro?: string
}

function baseUrl(): string {
  return (process.env.CLICKSIGN_API_URL || 'https://app.clicksign.com/api/v1').replace(/\/+$/, '')
}

// Host da página/widget (deriva o ambiente do host da API). prod vs sandbox.
export function clicksignHost(): string {
  try {
    const u = new URL(baseUrl())
    return `${u.protocol}//${u.host}`
  } catch {
    return 'https://app.clicksign.com'
  }
}

// Signatário fixo da Vertex (dados Vertex são hardcoded — ver memória vertex-dados-fixos).
export function vertexSignatario(): Signatario {
  return {
    nome: process.env.CLICKSIGN_VERTEX_SIGNER_NAME || 'Vertex BPO',
    email: process.env.CLICKSIGN_VERTEX_SIGNER_EMAIL || process.env.RESEND_FROM || 'contato@vertexbpo.com.br',
    cpf: process.env.CLICKSIGN_VERTEX_SIGNER_CPF || undefined,
  }
}

async function api<T>(method: 'POST' | 'GET', path: string, token: string, body?: unknown): Promise<T> {
  const url = `${baseUrl()}${path}?access_token=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickSign ${res.status} em ${method} ${path}: ${text}`)
  return (text ? JSON.parse(text) : {}) as T
}

export async function criarDocumentoAssinatura(opts: DocAssinaturaOpts): Promise<DocAssinaturaResultado> {
  const token = process.env.CLICKSIGN_API_TOKEN
  if (!token) {
    // STUB
    const docKey = `cs-stub-${Date.now()}`
    const keys: Record<string, string> = {}
    opts.signatarios.forEach((s, i) => {
      keys[s.email.toLowerCase()] = `${docKey}-sig${i}`
    })
    console.log('[clicksign STUB] documento simulado:', { nome: opts.nome, doc: docKey, signatarios: Object.keys(keys) })
    return { ok: true, doc_id: docKey, keys }
  }

  try {
    const deadline = new Date(Date.now() + (opts.deadlineDias ?? 30) * 24 * 60 * 60 * 1000)

    // 1) Documento
    const doc = await api<{ document: { key: string } }>('POST', '/documents', token, {
      document: {
        path: `/${opts.nome}.pdf`,
        content_base64: `data:application/pdf;base64,${opts.pdfBase64}`,
        deadline_at: deadline.toISOString(),
        auto_close: true,
        locale: 'pt-BR',
        sequence_enabled: opts.signatarios.length > 1,
      },
    })
    const documentKey = doc.document.key

    // 2 + 3) Para cada signatário: cria signer (tokenless) e vincula via list (na ordem)
    const keys: Record<string, string> = {}
    for (const s of opts.signatarios) {
      const cpf = s.cpf ? s.cpf.replace(/\D/g, '') : undefined
      const signer = await api<{ signer: { key: string } }>('POST', '/signers', token, {
        signer: {
          email: s.email,
          name: s.nome,
          auths: ['tokenless'], // assinatura embedded sem token
          delivery: 'email',
          ...(cpf ? { documentation: cpf, has_documentation: true } : { has_documentation: false }),
        },
      })
      const list = await api<{ list: { request_signature_key: string } }>('POST', '/lists', token, {
        list: {
          document_key: documentKey,
          signer_key: signer.signer.key,
          sign_as: 'sign',
          message: opts.mensagem ?? 'Por favor, assine o documento.',
        },
      })
      keys[s.email.toLowerCase()] = list.list.request_signature_key
    }

    return { ok: true, doc_id: documentKey, keys }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao criar documento na ClickSign.' }
  }
}

// Baixa o PDF final assinado de um documento fechado.
export async function baixarPdfAssinado(
  docKey: string,
): Promise<{ ok: boolean; buffer?: Buffer; erro?: string }> {
  const token = process.env.CLICKSIGN_API_TOKEN
  if (!token) {
    return { ok: false, erro: 'Sem CLICKSIGN_API_TOKEN — download indisponível em modo stub.' }
  }
  try {
    const info = await api<{ document: { downloads?: { signed_file_url?: string } } }>(
      'GET',
      `/documents/${docKey}`,
      token,
    )
    const fileUrl = info.document.downloads?.signed_file_url
    if (!fileUrl) return { ok: false, erro: 'PDF assinado ainda não disponível.' }
    const res = await fetch(fileUrl)
    if (!res.ok) return { ok: false, erro: `Falha ao baixar PDF assinado: ${res.status}` }
    const arr = new Uint8Array(await res.arrayBuffer())
    return { ok: true, buffer: Buffer.from(arr) }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao baixar PDF assinado.' }
  }
}
