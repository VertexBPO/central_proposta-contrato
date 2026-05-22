'use client'

import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  html: string
}

export function PreviewHtml({ open, onClose, titulo, html }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={titulo} maxWidth={820}>
      <div
        className="preview-html"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5EAF2',
          borderRadius: 8,
          padding: '32px 40px',
          fontFamily: 'Calibri, "Calibri Light", system-ui, sans-serif',
          color: '#000000',
          fontSize: 14,
          lineHeight: '20px',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: html || '<p style="color:#8A9AB5">Vazio.</p>' }}
      />
      <style jsx global>{`
        .preview-html {
          font-family: Calibri, "Calibri Light", system-ui, sans-serif;
        }
        .preview-html h1 {
          font-size: 18px;
          font-weight: 700;
          margin: 22px 0 10px;
          color: #000;
        }
        .preview-html h2 {
          font-size: 15px;
          font-weight: 700;
          margin: 18px 0 6px;
          color: #000;
        }
        .preview-html h3 {
          font-size: 14px;
          font-weight: 700;
          margin: 14px 0 4px 16px;
          color: #000;
        }
        .preview-html p {
          margin: 0 0 12px 0;
          color: #000;
          font-weight: 300;
        }
        .preview-html ul,
        .preview-html ol {
          padding-left: 28px;
          margin: 0 0 12px;
        }
        .preview-html li {
          margin: 0 0 8px;
          color: #000;
          font-weight: 300;
        }
        .preview-html strong {
          font-weight: 700;
        }
        .preview-html em {
          font-style: italic;
        }
      `}</style>
    </Modal>
  )
}
