'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: '#0D1B3E',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              lineHeight: '32px',
              fontWeight: 700,
              color: '#0D1B3E',
              marginBottom: 8,
            }}
          >
            Central de Propostas
          </h1>
          <p style={{ color: '#8A9AB5', fontSize: 14 }}>Vertex BPO e Assessoria Empresarial</p>
        </div>

        <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />

          {erro && (
            <div
              style={{
                background: '#FEE',
                color: '#D64545',
                padding: 12,
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {erro}
            </div>
          )}

          <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
            Entrar
          </Button>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <a
              href="/esqueci-senha"
              style={{ fontSize: 13, color: '#8A9AB5' }}
            >
              Esqueci a senha
            </a>
          </div>
        </form>
      </Card>
    </div>
  )
}
