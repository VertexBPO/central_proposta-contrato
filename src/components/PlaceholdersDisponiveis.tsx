'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PLACEHOLDERS_DISPONIVEIS } from '@/lib/docs/valores-placeholders'
import { CATEGORIA_LABEL, CustomPlaceholder, CustomPlaceholderCategoria } from '@/lib/db/types'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import {
  criarCustomPlaceholder,
  editarCustomPlaceholder,
  apagarCustomPlaceholder,
} from '@/app/(app)/templates/custom-placeholders-actions'

interface Props {
  categorias: Array<keyof typeof PLACEHOLDERS_DISPONIVEIS>
  customCategorias: CustomPlaceholderCategoria[]
  customPlaceholders: CustomPlaceholder[]
}

export function PlaceholdersDisponiveis({ categorias, customCategorias, customPlaceholders }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<CustomPlaceholder | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<CustomPlaceholderCategoria>(customCategorias[0])
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function copiar(ph: string) {
    await navigator.clipboard.writeText(`{{${ph}}}`)
    setCopiado(ph)
    setTimeout(() => setCopiado(null), 1200)
  }

  function abrirNovo() {
    setEditando(null)
    setNome('')
    setDescricao('')
    setCategoria(customCategorias[0])
    setAtivo(true)
    setErro(null)
    setModalAberto(true)
  }

  function abrirEdit(p: CustomPlaceholder) {
    setEditando(p)
    setNome(p.nome)
    setDescricao(p.descricao)
    setCategoria(p.categoria)
    setAtivo(p.ativo)
    setErro(null)
    setModalAberto(true)
  }

  async function salvar() {
    setErro(null)
    setSalvando(true)
    const r = editando
      ? await editarCustomPlaceholder(editando.id, { nome, descricao, ativo })
      : await criarCustomPlaceholder({ categoria, nome, descricao })
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar.')
      return
    }
    setModalAberto(false)
    startTransition(() => router.refresh())
  }

  async function apagar(p: CustomPlaceholder) {
    if (!window.confirm(`Apagar placeholder "{{${p.nome}}}"?`)) return
    const r = await apagarCustomPlaceholder(p.id)
    if (!r.ok) {
      window.alert(r.erro ?? 'Erro ao apagar.')
      return
    }
    startTransition(() => router.refresh())
  }

  // Custom agrupados por categoria
  const customPorCat: Record<string, CustomPlaceholder[]> = {}
  for (const c of customPlaceholders) {
    if (!customCategorias.includes(c.categoria)) continue
    const label = CATEGORIA_LABEL[c.categoria]
    if (!customPorCat[label]) customPorCat[label] = []
    customPorCat[label].push(c)
  }

  return (
    <>
      <div
        style={{
          background: '#F0F4FB',
          border: '1px solid #E5EAF2',
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#0D1B3E',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 0,
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{'{ }'}</span>
            Placeholders
            <span style={{ fontSize: 11, color: '#8A9AB5', fontWeight: 500 }}>
              {aberto ? '▲' : '▼'}
            </span>
          </button>
          <button
            type="button"
            onClick={abrirNovo}
            style={{
              background: 'linear-gradient(135deg, #0D1B3E 0%, #1B2D5A 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 1px 2px rgba(13,27,62,0.2)',
            }}
          >
            ＋ Novo
          </button>
        </div>

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
                    <PhRow key={p.nome} nome={p.nome} descricao={p.descricao} copiado={copiado} onCopy={copiar} />
                  ))}
                </div>
              </div>
            ))}

            {Object.entries(customPorCat).map(([cat, lista]) => (
              <div key={cat} style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#1B9E5C',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  {cat} — Personalizados
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lista.map((p) => (
                    <PhRow
                      key={p.id}
                      nome={p.nome}
                      descricao={p.descricao}
                      copiado={copiado}
                      onCopy={copiar}
                      inativo={!p.ativo}
                      onEdit={() => abrirEdit(p)}
                      onDelete={() => apagar(p)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar placeholder' : 'Novo placeholder'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!editando && (
            <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CustomPlaceholderCategoria)}>
              {customCategorias.map((c) => (
                <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
              ))}
            </Select>
          )}
          <Input
            label="Nome (sem chaves)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: cidade_foro"
          />
          <Input
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="ex: Cidade do foro do contrato"
          />
          {editando && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Ativo (aparece como campo no form de nova proposta)
            </label>
          )}
          <div style={{ fontSize: 12, color: '#8A9AB5', background: '#F8FAFE', padding: 10, borderRadius: 8 }}>
            ℹ️ O nome é normalizado pra `snake_case`. No template Word, use {`{{nome}}`}. O valor é digitado pelo operador ao criar a proposta.
          </div>
          {erro && <div style={{ background: '#FCE8E8', color: '#D64545', padding: 10, borderRadius: 8, fontSize: 13 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>{editando ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

interface RowProps {
  nome: string
  descricao: string
  copiado: string | null
  onCopy: (nome: string) => void
  inativo?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

function PhRow({ nome, descricao, copiado, onCopy, inativo, onEdit, onDelete }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px',
        background: copiado === nome ? '#E6F5EC' : '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 8,
        gap: 8,
        opacity: inativo ? 0.5 : 1,
      }}
    >
      <button
        type="button"
        onClick={() => onCopy(nome)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 0,
        }}
      >
        <code style={{ fontSize: 12, fontFamily: 'monospace', color: '#0D1B3E', fontWeight: 600 }}>
          {`{{${nome}}}`}
        </code>
        <span style={{ fontSize: 11, color: '#8A9AB5', flex: 1 }}>{descricao}</span>
        {copiado === nome && <span style={{ fontSize: 11, color: '#1B9E5C', fontWeight: 600 }}>copiado ✓</span>}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: '#8A9AB5',
            padding: '2px 6px',
          }}
        >
          editar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: '#D64545',
            padding: '2px 6px',
          }}
        >
          apagar
        </button>
      )}
    </div>
  )
}
