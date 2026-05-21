import { Card } from '@/components/Card'

export default function ExpiradoPage() {
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
      <Card style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 12 }}>
          Link expirado
        </h1>
        <p style={{ color: '#8A9AB5', fontSize: 14, lineHeight: '20px' }}>
          Esse link de acesso não está mais válido. Entre em contato com a Vertex para receber um novo link.
        </p>
      </Card>
    </div>
  )
}
