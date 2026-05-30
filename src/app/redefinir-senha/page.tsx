'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'

export default function RedefinirSenhaPage() {
  const supabase = createClient()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false) // sessão de recuperação ativa
  const [ok, setOk] = useState(false)

  useEffect(() => {
    // O link do e-mail estabelece a sessão de recuperação (PKCE / detectSessionInUrl).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setPronto(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (senha.length < 8) return setErro('A senha precisa ter ao menos 8 caracteres.')
    if (senha !== confirma) return setErro('As senhas não conferem.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (error) {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.')
      return
    }
    setOk(true)
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
            Definir nova senha
          </h1>
          <p style={{ color: '#8A9AB5', fontSize: 14 }}>Escolha uma senha com pelo menos 8 caracteres.</p>
        </div>

        {ok ? (
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
              Senha redefinida com sucesso!
            </div>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/login" style={{ fontSize: 13, color: '#2E6FE5', fontWeight: 600 }}>
                Ir para o login
              </a>
            </div>
          </>
        ) : !pronto ? (
          <div style={{ textAlign: 'center', color: '#8A9AB5', fontSize: 14 }}>
            <p style={{ marginBottom: 16 }}>
              Validando o link de recuperação… Se você abriu esta página direto (sem o link do e-mail), o acesso não é válido.
            </p>
            <a href="/esqueci-senha" style={{ fontSize: 13, color: '#2E6FE5' }}>
              Solicitar novo link
            </a>
          </div>
        ) : (
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Nova senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
              autoComplete="new-password"
            />

            {erro && (
              <div style={{ background: '#FEE', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
                {erro}
              </div>
            )}

            <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
              Salvar nova senha
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
