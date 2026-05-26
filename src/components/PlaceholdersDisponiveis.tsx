'use client'

import { useState } from 'react'
import { PLACEHOLDERS_DISPONIVEIS } from '@/lib/docs/valores-placeholders'

interface Props {
  categorias: Array<keyof typeof PLACEHOLDERS_DISPONIVEIS>
}

export function PlaceholdersDisponiveis({ categorias }: Props) {
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function copiar(ph: string) {
    await navigator.clipboard.writeText(`{{${ph}}}`)
    setCopiado(ph)
    setTimeout(() => setCopiado(null), 1200)
  }

  return (
    <div
      style={{
        background: '#F0F4FB',
        border: '1px solid #E5EAF2',
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#0D1B3E',
        }}
      >
        <span>📋 Placeholders disponíveis (clique pra copiar)</span>
        <span style={{ fontSize: 11, color: '#8A9AB5' }}>{aberto ? '▲ ocultar' : '▼ ver lista'}</span>
      </button>

      {aberto && (
        <div style={{ padding: '0 16px 16px' }}>
          {categorias.map((cat) => (
            <div key={cat} style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8A9AB5',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                {cat}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PLACEHOLDERS_DISPONIVEIS[cat].map((p) => (
                  <button
                    key={p.nome}
                    type="button"
                    onClick={() => copiar(p.nome)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: copiado === p.nome ? '#E6F5EC' : '#FFFFFF',
                      border: '1px solid #E5EAF2',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                  >
                    <code
                      style={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: '#0D1B3E',
                        fontWeight: 600,
                      }}
                    >
                      {`{{${p.nome}}}`}
                    </code>
                    <span style={{ fontSize: 11, color: '#8A9AB5', marginLeft: 12, flex: 1 }}>
                      {p.descricao}
                    </span>
                    {copiado === p.nome && (
                      <span style={{ fontSize: 11, color: '#1B9E5C', fontWeight: 600 }}>copiado ✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
