'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Parameters } from '@/lib/db/types'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'

export function ParametrosForm({ parametros }: { parametros: Parameters }) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState(parametros.email_vertex)
  const [intervalo, setIntervalo] = useState(parametros.intervalo_lembrete_dias)
  const [maxLembretes, setMaxLembretes] = useState(parametros.max_lembretes)
  const [timeoutContrato, setTimeoutContrato] = useState(parametros.timeout_contrato_dias)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function salvar() {
    setErro(null)
    setOk(false)
    setSalvando(true)
    const { error } = await supabase
      .from('parameters')
      .update({
        email_vertex: email.trim(),
        intervalo_lembrete_dias: intervalo,
        max_lembretes: maxLembretes,
        timeout_contrato_dias: timeoutContrato,
      })
      .eq('id', 1)
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOk(true)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Parâmetros" subtitle="Configurações globais do sistema (admin)" />

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B3E', marginBottom: 16, textTransform: 'uppercase' }}>
          E-mail Vertex
        </h3>
        <Input
          label="E-mail que recebe BCC de todos os envios"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#0D1B3E',
            marginTop: 24,
            marginBottom: 16,
            textTransform: 'uppercase',
          }}
        >
          Lembretes automáticos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Input
            label="Intervalo (dias)"
            type="number"
            min={1}
            value={intervalo}
            onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))}
          />
          <Input
            label="Máximo de lembretes"
            type="number"
            min={0}
            value={maxLembretes}
            onChange={(e) => setMaxLembretes(Math.max(0, Number(e.target.value) || 0))}
          />
          <Input
            label="Timeout contrato (dias)"
            type="number"
            min={1}
            value={timeoutContrato}
            onChange={(e) => setTimeoutContrato(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        <p style={{ fontSize: 12, color: '#8A9AB5', marginTop: 16 }}>
          💡 Os <strong>contratantes</strong> (razão social, CNPJ, endereço) agora são cadastrados em uma página separada → acessar pelo menu <strong>"Contratantes"</strong>.
        </p>

        {erro && (
          <div style={{ marginTop: 16, padding: 12, background: '#FCE8E8', color: '#D64545', borderRadius: 10, fontSize: 13 }}>
            {erro}
          </div>
        )}
        {ok && (
          <div style={{ marginTop: 16, padding: 12, background: '#E6F5EC', color: '#1B9E5C', borderRadius: 10, fontSize: 13 }}>
            Salvo com sucesso!
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={salvar} loading={salvando}>
            Salvar parâmetros
          </Button>
        </div>
      </Card>
    </div>
  )
}
