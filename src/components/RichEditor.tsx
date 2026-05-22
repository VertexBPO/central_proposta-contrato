'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  label?: string
  minHeight?: number
}

const BTN_STYLE: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  fontWeight: 600,
  background: '#FFFFFF',
  color: '#0D1B3E',
  border: '1px solid #E5EAF2',
  borderRadius: 6,
  cursor: 'pointer',
}

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN_STYLE,
  background: '#0D1B3E',
  color: '#FFFFFF',
  borderColor: '#0D1B3E',
}

export function RichEditor({ value, onChange, label, minHeight = 320 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px;padding:18px 22px;font-size:14px;line-height:22px;color:#0D1B3E;outline:none;`,
      },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#0D1B3E',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
      <div
        style={{
          border: '1px solid #E5EAF2',
          borderRadius: 10,
          background: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: 8,
            borderBottom: '1px solid #E5EAF2',
            background: '#F0F4FB',
          }}
        >
          <button
            type="button"
            style={editor.isActive('heading', { level: 1 }) ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button
            type="button"
            style={editor.isActive('heading', { level: 2 }) ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            type="button"
            style={editor.isActive('heading', { level: 3 }) ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
          <span style={{ width: 1, background: '#E5EAF2', margin: '0 4px' }} />
          <button
            type="button"
            style={editor.isActive('bold') ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            style={{
              ...(editor.isActive('italic') ? BTN_ACTIVE : BTN_STYLE),
              fontStyle: 'italic',
            }}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            style={{
              ...(editor.isActive('strike') ? BTN_ACTIVE : BTN_STYLE),
              textDecoration: 'line-through',
            }}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </button>
          <span style={{ width: 1, background: '#E5EAF2', margin: '0 4px' }} />
          <button
            type="button"
            style={editor.isActive('bulletList') ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • Lista
          </button>
          <button
            type="button"
            style={editor.isActive('orderedList') ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. Lista
          </button>
          <button
            type="button"
            style={editor.isActive('blockquote') ? BTN_ACTIVE : BTN_STYLE}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝ Cita
          </button>
          <span style={{ width: 1, background: '#E5EAF2', margin: '0 4px' }} />
          <button
            type="button"
            style={BTN_STYLE}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            style={BTN_STYLE}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .ProseMirror h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 16px 0 8px;
          color: #0D1B3E;
        }
        .ProseMirror h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 14px 0 6px;
          color: #0D1B3E;
        }
        .ProseMirror h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 12px 0 4px;
          color: #0D1B3E;
        }
        .ProseMirror p {
          margin: 8px 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        .ProseMirror li {
          margin: 4px 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #0D1B3E;
          padding-left: 12px;
          margin: 12px 0;
          color: #8A9AB5;
          font-style: italic;
        }
        .ProseMirror strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
