import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Heurística: detecta hierarquia do título a partir do texto.
 * Retorna 1, 2 ou 3 (nivel) ou 0 (não é título).
 */
function detectarTitulo(texto: string): number {
  const t = texto.trim()
  if (!t) return 0

  // Padrões clássicos de contratos
  if (/^(INSTRUMENTO|CONTRATO|TERMO|ANEXO|APÊNDICE)\b/i.test(t) && t.length < 120) return 1
  if (/^CL[ÁA]USULA\s+[IVXLCDM]+/i.test(t)) return 2
  if (/^CAP[ÍI]TULO\s+/i.test(t)) return 1
  if (/^ART(IGO)?\.?\s*\d+/i.test(t)) return 2
  if (/^SE[ÇC][ÃA]O\s+/i.test(t)) return 2
  if (/^§\s*\d+/i.test(t)) return 0 // parágrafo, não título

  // Numeração hierárquica: 1. / 1.1 / 1.1.1
  const matchNum = t.match(/^(\d+)(\.\d+){0,3}\.?\s/)
  if (matchNum && t.length < 140) {
    const pontos = (matchNum[0].match(/\./g) || []).length
    if (pontos <= 1) return 1 // 1. ou 1
    if (pontos === 2) return 2 // 1.1
    return 3 // 1.1.1
  }

  // Linhas curtas em ALL CAPS (sem ser frase) = título
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÀÂÊÔÃÕÇáéíóúàâêôãõç]/g, '')
  if (letras.length >= 4 && letras === letras.toUpperCase() && t.length < 100) return 2

  return 0
}

interface ProcessadoBloco {
  html: string
  texto: string
}

async function docxToHtml(buffer: Buffer): Promise<ProcessadoBloco> {
  const zip = await JSZip.loadAsync(buffer)
  const documento = zip.file('word/document.xml')
  if (!documento) throw new Error('word/document.xml não encontrado')

  const xml = await documento.async('text')
  const paragrafos = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? []

  const blocosHtml: string[] = []
  const blocosTexto: string[] = []
  let listaAberta: 'ul' | 'ol' | null = null

  const fecharLista = () => {
    if (listaAberta) {
      blocosHtml.push(`</${listaAberta}>`)
      listaAberta = null
    }
  }

  for (const pXml of paragrafos) {
    const styleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/)
    const styleId = styleMatch?.[1]?.toLowerCase() ?? ''
    const hasNumbering = /<w:numPr\b/.test(pXml)

    const runs = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) ?? []
    let conteudoHtml = ''
    let conteudoTexto = ''

    for (const rXml of runs) {
      const isBold = /<w:b[\/ >]/.test(rXml) || /<w:b\s/.test(rXml)
      const isItalic = /<w:i[\/ >]/.test(rXml) || /<w:i\s/.test(rXml)
      const isUnderline = /<w:u\b/.test(rXml)
      const textosMatches = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []
      const texto = textosMatches
        .map((t) => {
          const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/)
          return m?.[1] ?? ''
        })
        .join('')
      if (/<w:tab\b/.test(rXml)) {
        conteudoHtml += '    '
        conteudoTexto += '\t'
      }
      if (/<w:br\b/.test(rXml)) {
        conteudoHtml += '<br>'
        conteudoTexto += '\n'
      }
      let html = escaparHtml(decodeEntities(texto))
      if (isBold) html = `<strong>${html}</strong>`
      if (isItalic) html = `<em>${html}</em>`
      if (isUnderline) html = `<u>${html}</u>`
      conteudoHtml += html
      conteudoTexto += texto
    }

    const textoLimpo = conteudoTexto.trim()
    if (!textoLimpo && !conteudoHtml.trim()) continue
    blocosTexto.push(textoLimpo)

    // 1) Heading explícito do Word
    if (styleId.startsWith('heading') || styleId.startsWith('titulo') || styleId === 'title') {
      fecharLista()
      const m = styleId.match(/(\d)/)
      const level = m ? Math.min(parseInt(m[1]), 3) : 1
      blocosHtml.push(`<h${level}>${conteudoHtml}</h${level}>`)
      continue
    }

    // 2) Lista do Word
    if (hasNumbering) {
      const isOrdered = /<w:numId[^>]*w:val="[2-9]/.test(pXml) || /numFmt[^>]*decimal/.test(pXml)
      const tipo: 'ul' | 'ol' = isOrdered ? 'ol' : 'ul'
      if (listaAberta !== tipo) {
        fecharLista()
        blocosHtml.push(`<${tipo}>`)
        listaAberta = tipo
      }
      blocosHtml.push(`<li>${conteudoHtml}</li>`)
      continue
    }

    // 3) Heurística por padrão de texto
    const nivelHeuristica = detectarTitulo(textoLimpo)
    if (nivelHeuristica > 0) {
      fecharLista()
      blocosHtml.push(`<h${nivelHeuristica}>${conteudoHtml}</h${nivelHeuristica}>`)
      continue
    }

    fecharLista()
    blocosHtml.push(`<p>${conteudoHtml}</p>`)
  }
  fecharLista()

  return { html: blocosHtml.join(''), texto: blocosTexto.join('\n') }
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
    const { html, texto } = await docxToHtml(buffer)
    return NextResponse.json({ html, texto })
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : 'Falha ao processar arquivo.' },
      { status: 500 }
    )
  }
}
