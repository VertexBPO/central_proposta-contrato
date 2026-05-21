import { TemplatesNav } from './nav'

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <TemplatesNav />
      {children}
    </div>
  )
}
