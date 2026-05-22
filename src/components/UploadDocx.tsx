'use client'

import { useState, useRef } from 'react'
import { Button } from './Button'

interface Props {
  onTextoExtraido: (texto: string) => void
}

export function UploadDocx({ onTextoExtraido }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)

  async function handleArquivo(file: File) {
    setErro(null)
    setNomeArquivo(file.name)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/docx/extrair-texto', { method: 'POST', body: form })
      const data = await r.json()
      if (!r.ok) {
        setErro(data.erro ?? 'Erro ao extrair texto.')
        return
      }
      onTextoExtraido(data.texto)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro de rede.')
    } finally {
      setLoading(false)
    }
  }

  function onPick() {
    fileInputRef.current?.click()
  }

  return (
    <div
      style={{
        border: '1px dashed #8A9AB5',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#F0F4FB',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleArquivo(f)
        }}
      />
      <Button type="button" variant="secondary" onClick={onPick} disabled={loading}>
        {loading ? 'Extraindo…' : '📎 Carregar .docx'}
      </Button>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#8A9AB5' }}>
        {erro ? (
          <span style={{ color: '#D64545' }}>{erro}</span>
        ) : nomeArquivo ? (
          <>
            <strong style={{ color: '#0D1B3E' }}>{nomeArquivo}</strong>
            {!loading && <span style={{ marginLeft: 8 }}>· texto carregado abaixo</span>}
          </>
        ) : (
          <>Arquivo Word com o conteúdo. O texto vai aparecer abaixo pra você revisar.</>
        )}
      </div>
    </div>
  )
}
