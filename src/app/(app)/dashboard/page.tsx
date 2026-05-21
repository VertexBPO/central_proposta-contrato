import { Card } from '@/components/Card'

const STATUS_CARDS = [
  { titulo: 'Em preenchimento', valor: 0, cor: '#8A9AB5' },
  { titulo: 'Aguardando aprovação', valor: 0, cor: '#E8A93C' },
  { titulo: 'Enviadas', valor: 0, cor: '#2E6FE5' },
  { titulo: 'Abertas pelo cliente', valor: 0, cor: '#2E6FE5' },
  { titulo: 'Em negociação', valor: 0, cor: '#E8A93C' },
  { titulo: 'Fechadas', valor: 0, cor: '#1B9E5C' },
  { titulo: 'Contratos pendentes', valor: 0, cor: '#E8A93C' },
  { titulo: 'Perdidas', valor: 0, cor: '#D64545' },
]

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: '#8A9AB5', fontSize: 14 }}>
          Visão geral do funil comercial
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {STATUS_CARDS.map((card) => (
          <Card key={card.titulo} padding={20}>
            <div style={{ fontSize: 12, color: '#8A9AB5', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              {card.titulo}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: card.cor }}>{card.valor}</div>
          </Card>
        ))}
      </section>

      <Card>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Propostas recentes</h2>
        <p style={{ color: '#8A9AB5', fontSize: 14 }}>
          Nenhuma proposta ainda. Comece criando uma nova proposta no menu lateral.
        </p>
      </Card>
    </div>
  )
}
