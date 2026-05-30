'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'

export default function EsqueciSenhaPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    if (error) {
      setErro('Não foi possível enviar o e-mail. Tente novamente.')
      return
    }
    setEnviado(true)
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
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>
            Recuperar senha
          </h1>
          <p style={{ color: '#8A9AB5', fontSize: 14 }}>
            Informe seu e-mail e enviaremos um link para redefinir a senha.
          </p>
        </div>

        {enviado ? (
          <>
            <div
              style={{
                background: '#E6F5EC',
                color: '#1B9E5C',
                padding: 14,
                borderRadius: 10,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.
            </div>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/login" style={{ fontSize: 13, color: '#8A9AB5' }}>
                Voltar para o login
              </a>
            </div>
          </>
        ) : (
          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />

            {erro && (
              <div style={{ background: '#FEE', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
                {erro}
              </div>
            )}

            <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
              Enviar link de recuperação
            </Button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <a href="/login" style={{ fontSize: 13, color: '#8A9AB5' }}>
                Voltar para o login
              </a>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
