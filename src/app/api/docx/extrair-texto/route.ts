import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'

/**
 * Extrai texto plano de um .docx (Word 2007+).
 * Lê word/document.xml de dentro do zip e remove tags XML preservando quebras.
 */
async function extrairTextoDocx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const documento = zip.file('word/document.xml')
  if (!documento) throw new Error('word/document.xml não encontrado no arquivo')

  const xml = await documento.async('text')

  // Converte tags de parágrafo, quebra e tab em char correspondente.
  const comQuebras = xml
    .replace(/<w:p\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')

  // Remove o resto das tags XML.
  const semTags = comQuebras.replace(/<[^>]+>/g, '')

  // Decodifica entidades comuns.
  const decoded = semTags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

  // Normaliza espaços + quebras múltiplas.
  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ erro: 'Envie um arquivo no campo "file".' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ erro: 'Apenas arquivos .docx.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const texto = await extrairTextoDocx(buffer)
    return NextResponse.json({ texto })
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : 'Falha ao processar arquivo.' },
      { status: 500 }
    )
  }
}
