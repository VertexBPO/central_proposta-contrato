// Cliente ZapSign — stub até ZAPSIGN_API_TOKEN ser configurado.
// Doc: https://docs.zapsign.com.br/

interface EnviarDocumentoOpts {
  nome: string
  pdfBase64: string // base64 do PDF
  signatarioNome: string
  signatarioEmail: string
}

interface Resultado {
  ok: boolean
  doc_id?: string
  url_signatario?: string
  erro?: string
}

export async function enviarParaAssinatura(opts: EnviarDocumentoOpts): Promise<Resultado> {
  const token = process.env.ZAPSIGN_API_TOKEN
  if (!token) {
    // STUB
    const fakeId = `zap-stub-${Date.now()}`
    console.log('[zapsign STUB] documento simulado:', {
      nome: opts.nome,
      signatario: opts.signatarioEmail,
      docId: fakeId,
    })
    return {
      ok: true,
      doc_id: fakeId,
      url_signatario: `https://app.zapsign.com.br/verificar/${fakeId}`,
    }
  }

  try {
    const res = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: opts.nome,
        base64_pdf: opts.pdfBase64,
        signers: [
          {
            name: opts.signatarioNome,
            email: opts.signatarioEmail,
            auth_mode: 'assinaturaTela',
          },
        ],
        lang: 'pt-br',
        send_automatic_email: true,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return { ok: false, erro: `ZapSign: ${res.status} ${t}` }
    }
    const data = (await res.json()) as {
      open_id: number
      token: string
      signers: Array<{ sign_url: string }>
    }
    return {
      ok: true,
      doc_id: data.token,
      url_signatario: data.signers[0]?.sign_url,
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao enviar para ZapSign.' }
  }
}
