// Cliente Resend — stub até RESEND_API_KEY ser configurada.
// Para ativar produção, instalar `resend` e trocar implementação.

interface EnviarOpts {
  para: string
  bcc?: string
  assunto: string
  corpoHtml: string
  anexos?: Array<{ filename: string; content: Uint8Array | Buffer }>
}

interface Resultado {
  ok: boolean
  id?: string
  erro?: string
}

export async function enviarEmail(opts: EnviarOpts): Promise<Resultado> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // STUB: simula envio sem API key real
    console.log('[resend STUB] envio simulado:', {
      para: opts.para,
      bcc: opts.bcc,
      assunto: opts.assunto,
      tamanhoCorpo: opts.corpoHtml.length,
      anexos: opts.anexos?.map((a) => a.filename),
    })
    return { ok: true, id: `stub-${Date.now()}` }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Vertex BPO <no-reply@vertexbpo.com.br>',
        to: opts.para,
        bcc: opts.bcc,
        subject: opts.assunto,
        html: opts.corpoHtml,
        attachments: opts.anexos?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
        })),
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return { ok: false, erro: `Resend: ${res.status} ${t}` }
    }
    const data = (await res.json()) as { id: string }
    return { ok: true, id: data.id }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao enviar e-mail.' }
  }
}
