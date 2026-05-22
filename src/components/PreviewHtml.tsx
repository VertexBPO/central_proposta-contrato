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
        .preview-html h1,
        .ProseMirror h1 {
          font-size: 18px;
          font-weight: 700;
          margin: 18px 0 10px;
          color: #000;
        }
        .preview-html h2,
        .ProseMirror h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 16px 0 8px 16px;
          color: #000;
        }
        .preview-html h3,
        .ProseMirror h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 12px 0 6px 32px;
          color: #000;
        }
        .preview-html p,
        .ProseMirror p {
          margin: 8px 0;
          color: #000;
        }
        .preview-html ul,
        .preview-html ol {
          padding-left: 28px;
          margin: 8px 0;
        }
        .preview-html strong {
          font-weight: 700;
        }
      `}</style>
    </Modal>
  )
}
