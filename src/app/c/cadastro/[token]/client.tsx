'use client'

import { useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { formatCpf, validateCpf, onlyDigits } from '@/lib/db/cnpj'
import { formatCep } from '@/lib/db/mascaras'
import { salvarCadastroContrato, type CadastroInput } from './actions'

interface Props {
  token: string
  numero: string
  empresa: string
  emailCliente: string
  responsavelAtual: string
}

type Etapa = 'preencher' | 'enviado'

export function CadastroClient({ token, numero, empresa, emailCliente, responsavelAtual }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('preencher')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [nome, setNome] = useState(responsavelAtual)
  const [cargo, setCargo] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState(emailCliente)
  const [logradouro, setLogradouro] = useState('')
  const [numeroEnd, setNumeroEnd] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [cep, setCep] = useState('')

  async function enviar() {
    setErro(null)

    if (!nome.trim()) return setErro('Informe o nome do responsável.')
    if (!validateCpf(onlyDigits(cpf))) return setErro('CPF inválido.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('E-mail inválido.')

    const input: CadastroInput = {
      responsavel_nome: nome,
      responsavel_cargo: cargo,
      responsavel_cpf: cpf,
      responsavel_email: email,
      responsavel_endereco_logradouro: logradouro,
      responsavel_endereco_numero: numeroEnd,
      responsavel_endereco_complemento: complemento,
      responsavel_endereco_bairro: bairro,
      responsavel_endereco_cidade: cidade,
      responsavel_endereco_uf: uf,
      responsavel_endereco_cep: cep,
    }

    setSalvando(true)
    const r = await salvarCadastroContrato(token, input)
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar cadastro.')
      return
    }
    setEtapa('enviado')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Header empresa={empresa} numero={numero} />

        {etapa === 'preencher' && (
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0D1B3E', marginBottom: 6 }}>
              Dados do responsável pela assinatura
            </h2>
            <p style={{ fontSize: 13, color: '#8A9AB5', marginBottom: 22 }}>
              Esses dados entram no contrato e identificam quem vai assiná-lo digitalmente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Nome completo *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome de quem assina"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                  label="Cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex.: Sócio-administrador"
                />
                <Input
                  label="CPF *"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <Input
                label="E-mail corporativo *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responsavel@empresa.com.br"
              />

              <div style={{ marginTop: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0D1B3E', textTransform: 'uppercase' }}>
                  Endereço do responsável
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input
                  label="Logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua / Av."
                />
                <Input label="Número" value={numeroEnd} onChange={(e) => setNumeroEnd(e.target.value)} />
              </div>
              <Input
                label="Complemento"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Sala / andar"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                <Input
                  label="CEP"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                <Input
                  label="UF"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="ES"
                />
              </div>

              {erro && <Erro mensagem={erro} />}

              <Button onClick={enviar} loading={salvando} style={{ marginTop: 10 }}>
                Enviar cadastro
              </Button>
              <p style={{ fontSize: 11, color: '#8A9AB5', textAlign: 'center', marginTop: 2 }}>
                * Campos obrigatórios. Após o envio, a Vertex gera o contrato para assinatura.
              </p>
            </div>
          </Card>
        )}

        {etapa === 'enviado' && (
          <Card style={{ textAlign: 'center' }}>
            <Icone bg="#E6F5EC" cor="#1B9E5C">✓</Icone>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Cadastro enviado!</h2>
            <p style={{ fontSize: 14, color: '#5A6B85' }}>
              A Vertex vai gerar o contrato com esses dados e você receberá um e-mail da Clicksign com o link para
              assinar digitalmente. Pode fechar esta página.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function Header({ empresa, numero }: { empresa: string; numero: string }) {
  return (
    <div style={{ marginBottom: 24, textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #4F7CFF 0%, #2E6FE5 100%)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(46,111,229,0.3)',
        }}
      >
        V
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0D1B3E', marginBottom: 4 }}>
        Cadastro para o contrato {numero}
      </h1>
      <p style={{ fontSize: 14, color: '#8A9AB5' }}>{empresa} · Vertex BPO</p>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 16px rgba(13,27,62,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Icone({ bg, cor, children }: { bg: string; cor: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        background: bg,
        color: cor,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 700,
        margin: '0 auto 16px',
      }}
    >
      {children}
    </div>
  )
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <div
      style={{
        background: '#FCE8E8',
        color: '#D64545',
        padding: 12,
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      {mensagem}
    </div>
  )
}
