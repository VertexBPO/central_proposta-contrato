'use client'

import { useEffect, useRef, useState } from 'react'

// Widget de assinatura embedded da ClickSign (tokenless).
// Recebe a request_signature_key e o host (prod/sandbox).
//
// Estratégia: tenta carregar o widget oficial tokenless (`{host}/tokenlessWidget.js`,
// `new TokenlessWidget(key).mount(container)`). Como o app ainda não foi validado contra
// a conta real, mantém um fallback robusto: iframe da página de assinatura + botão
// "Já assinei" (a confirmação autoritativa real vem do webhook da ClickSign).
//
// onSigned: chamado quando o widget emite "signed" OU quando o usuário confirma manualmente.

interface Props {
  signatureKey: string
  host: string // ex.: https://app.clicksign.com
  onSigned: () => void
  altura?: number
}

interface TokenlessWidgetInstance {
  mount: (containerId: string, textTemplate?: string) => void
  on?: (event: string, cb: () => void) => void
  unmount?: () => void
}
type TokenlessWidgetCtor = new (key: string) => TokenlessWidgetInstance

declare global {
  interface Window {
    TokenlessWidget?: TokenlessWidgetCtor
  }
}

const CONTAINER_ID = 'clicksign-embed-container'

export function ClicksignEmbed({ signatureKey, host, onSigned, altura = 640 }: Props) {
  const [usouWidget, setUsouWidget] = useState(false)
  const montadoRef = useRef(false)

  useEffect(() => {
    let cancelado = false

    function montarWidget() {
      if (cancelado || montadoRef.current || !window.TokenlessWidget) return
      try {
        const widget = new window.TokenlessWidget(signatureKey)
        widget.mount(CONTAINER_ID)
        widget.on?.('signed', () => onSigned())
        montadoRef.current = true
        setUsouWidget(true)
      } catch {
        // mantém o fallback de iframe
      }
    }

    if (window.TokenlessWidget) {
      montarWidget()
    } else {
      const existente = document.querySelector<HTMLScriptElement>('script[data-clicksign-widget]')
      if (existente) {
        existente.addEventListener('load', montarWidget)
      } else {
        const s = document.createElement('script')
        s.src = `${host}/tokenlessWidget.js`
        s.async = true
        s.dataset.clicksignWidget = 'true'
        s.addEventListener('load', montarWidget)
        document.body.appendChild(s)
      }
    }

    // Sinal de assinatura via postMessage (alguns ambientes ClickSign emitem assim)
    function onMessage(ev: MessageEvent) {
      if (typeof ev.data === 'string' && ev.data.toLowerCase().includes('sign')) onSigned()
      else if (ev.data && typeof ev.data === 'object' && (ev.data as { event?: string }).event === 'signed') onSigned()
    }
    window.addEventListener('message', onMessage)
    return () => {
      cancelado = true
      window.removeEventListener('message', onMessage)
    }
  }, [signatureKey, host, onSigned])

  const signUrl = `${host}/sign/${signatureKey}`

  return (
    <div>
      <div
        id={CONTAINER_ID}
        style={{
          width: '100%',
          minHeight: altura,
          border: '1px solid #E5EAF2',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#FFFFFF',
        }}
      >
        {!usouWidget && (
          <iframe
            src={signUrl}
            title="Assinatura ClickSign"
            style={{ width: '100%', height: altura, border: 'none', display: 'block' }}
          />
        )}
      </div>
      {!usouWidget && (
        <p style={{ fontSize: 12, color: '#8A9AB5', marginTop: 10, textAlign: 'center' }}>
          Não carregou a assinatura?{' '}
          <a href={signUrl} target="_blank" rel="noreferrer" style={{ color: '#2E6FE5' }}>
            Abrir em nova aba
          </a>
        </p>
      )}
    </div>
  )
}
