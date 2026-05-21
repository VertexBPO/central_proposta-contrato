import { Card } from '@/components/Card'

export default function ConfirmadoPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1B3E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Card style={{ maxWidth: 460, textAlign: 'center', padding: 40 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 9999,
            background: '#E6F5EC',
            color: '#1B9E5C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 12 }}>
          Dados enviados!
        </h1>
        <p style={{ color: '#8A9AB5', fontSize: 14, lineHeight: '22px' }}>
          Recebemos suas informações. A Vertex vai montar sua proposta e enviar pelo e-mail informado nas próximas
          horas.
        </p>
        <p style={{ color: '#8A9AB5', fontSize: 13, marginTop: 16 }}>Pode fechar esta janela.</p>
      </Card>
    </div>
  )
}
