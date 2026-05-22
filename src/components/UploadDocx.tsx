'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from './Button'

interface Props {
  onArquivoSalvo: (storagePath: string, nomeArquivo: string) => void
  pastaStorage: 'proposal-templates' | 'contract-templates' | 'scope-templates'
  arquivoAtual?: string | null
}

export function UploadDocx({ onArquivoSalvo, pastaStorage, arquivoAtual }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(arquivoAtual ?? null)

  async function handleArquivo(file: File) {
    setErro(null)
    setLoading(true)
    try {
      // Caminho único: pasta + uuid-like + nome
      const ext = file.name.toLowerCase().endsWith('.docx') ? '.docx' : ''
      if (!ext) {
        setErro('Apenas arquivos .docx.')
        return
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${pastaStorage}/${Date.now()}-${safeName}`

      const { error: upErr } = await supabase.storage
        .from('templates')
        .upload(path, file, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        })

      if (upErr) {
        setErro(upErr.message)
        return
      }

      setNomeArquivo(file.name)
      onArquivoSalvo(path, file.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro de rede.')
    } finally {
      setLoading(false)
    }
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
      <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
        {loading ? 'Enviando…' : nomeArquivo ? '📎 Substituir .docx' : '📎 Upload .docx'}
      </Button>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#8A9AB5' }}>
        {erro ? (
          <span style={{ color: '#D64545' }}>{erro}</span>
        ) : nomeArquivo ? (
          <>
            <span style={{ color: '#1B9E5C', fontWeight: 600 }}>✓</span>{' '}
            <strong style={{ color: '#0D1B3E' }}>{nomeArquivo}</strong>
            {!loading && <span style={{ marginLeft: 8 }}>· salvo no template</span>}
          </>
        ) : (
          <>Arquivo Word com <code>{`{{placeholders}}`}</code> já definidos. Tudo no Word — logo, marca d&apos;água, formatação. O sistema só substitui as variáveis.</>
        )}
      </div>
    </div>
  )
}
