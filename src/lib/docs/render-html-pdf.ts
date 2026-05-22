/**
 * Renderiza HTML simples em PDF via pdf-lib.
 * Suporta: h1, h2, h3, p, ul, ol, li, strong/b, em/i, br, blockquote.
 */
import { parse, HTMLElement, Node, TextNode } from 'node-html-parser'
import { rgb, type PDFPage, type PDFFont, type PDFDocument } from 'pdf-lib'

interface RenderState {
  doc: PDFDocument
  page: PDFPage
  cursorY: number
  font: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
  pageWidth: number
  pageHeight: number
  margin: number
  marginBottom: number
}

const COR_TEXTO = rgb(0, 0, 0)

function novaPagina(state: RenderState) {
  state.page = state.doc.addPage([state.pageWidth, state.pageHeight])
  state.cursorY = state.pageHeight - state.margin
}

interface RunSegment {
  texto: string
  bold: boolean
  italic: boolean
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function colecionarRuns(node: Node, bold = false, italic = false): RunSegment[] {
  const segs: RunSegment[] = []
  if (node.nodeType === 3) {
    const t = decodeEntities((node as TextNode).rawText)
    if (t) segs.push({ texto: t, bold, italic })
    return segs
  }
  if (node.nodeType === 1) {
    const el = node as HTMLElement
    const tag = el.tagName?.toLowerCase()
    let b = bold
    let i = italic
    if (tag === 'strong' || tag === 'b') b = true
    if (tag === 'em' || tag === 'i') i = true
    if (tag === 'br') {
      segs.push({ texto: '\n', bold, italic })
      return segs
    }
    for (const child of el.childNodes) {
      segs.push(...colecionarRuns(child, b, i))
    }
  }
  return segs
}

function fonteDeSegmento(seg: RunSegment, state: RenderState): PDFFont {
  if (seg.bold && seg.italic) return state.boldItalic
  if (seg.bold) return state.bold
  if (seg.italic) return state.italic
  return state.font
}

function quebraEmLinhas(
  segs: RunSegment[],
  state: RenderState,
  size: number,
  indent = 0
): Array<RunSegment[]> {
  const linhas: Array<RunSegment[]> = []
  let linhaAtual: RunSegment[] = []
  let larguraAtual = 0
  const maxW = state.pageWidth - state.margin * 2 - indent

  const empurra = () => {
    linhas.push(linhaAtual)
    linhaAtual = []
    larguraAtual = 0
  }

  for (const seg of segs) {
    const partes = seg.texto.split('\n')
    for (let p = 0; p < partes.length; p++) {
      if (p > 0) empurra()
      const tokens = partes[p].split(/(\s+)/)
      for (const tok of tokens) {
        if (!tok) continue
        const font = fonteDeSegmento(seg, state)
        const w = font.widthOfTextAtSize(tok, size)
        if (larguraAtual + w > maxW && linhaAtual.length > 0 && tok.trim()) {
          empurra()
          linhaAtual.push({ ...seg, texto: tok })
          larguraAtual = w
        } else {
          linhaAtual.push({ ...seg, texto: tok })
          larguraAtual += w
        }
      }
    }
  }
  if (linhaAtual.length > 0) empurra()
  return linhas
}

function desenharLinha(
  state: RenderState,
  linha: RunSegment[],
  size: number,
  lineHeight: number,
  indent = 0
) {
  if (state.cursorY - lineHeight < state.marginBottom) novaPagina(state)
  let x = state.margin + indent
  for (const seg of linha) {
    const font = fonteDeSegmento(seg, state)
    state.page.drawText(seg.texto, {
      x,
      y: state.cursorY - size,
      size,
      font,
      color: COR_TEXTO,
    })
    x += font.widthOfTextAtSize(seg.texto, size)
  }
  state.cursorY -= lineHeight
}

function renderizarParagrafo(
  state: RenderState,
  segs: RunSegment[],
  size: number,
  lineHeight: number,
  espacoDepois = 4,
  indent = 0
) {
  const linhas = quebraEmLinhas(segs, state, size, indent)
  for (const linha of linhas) desenharLinha(state, linha, size, lineHeight, indent)
  state.cursorY -= espacoDepois
}

export function renderizarHtmlNoPdf(state: RenderState, html: string) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html)
  if (!isHtml) {
    for (const linha of html.split('\n')) {
      if (!linha.trim()) {
        state.cursorY -= 6
        continue
      }
      renderizarParagrafo(state, [{ texto: linha, bold: false, italic: false }], 10, 14)
    }
    return
  }

  const root = parse(`<root>${html}</root>`)

  let listaTipo: 'ul' | 'ol' | null = null
  let listaContador = 0

  const processarNo = (no: Node) => {
    if (no.nodeType === 3) {
      const t = decodeEntities((no as TextNode).rawText).trim()
      if (t) renderizarParagrafo(state, [{ texto: t, bold: false, italic: false }], 10, 14)
      return
    }
    if (no.nodeType !== 1) return
    const el = no as HTMLElement
    const tag = el.tagName?.toLowerCase()
    const segs = colecionarRuns(el)

    // Força títulos como bold
    const segsBold = (s: RunSegment[]) => s.map((x) => ({ ...x, bold: true }))

    switch (tag) {
      case 'h1':
        state.cursorY -= 14 // espaçamento duplo antes
        renderizarParagrafo(state, segsBold(segs), 14, 20, 10, 0)
        break
      case 'h2':
        state.cursorY -= 10 // espaço antes
        renderizarParagrafo(state, segsBold(segs), 12, 18, 8, 0)
        break
      case 'h3':
        state.cursorY -= 4
        renderizarParagrafo(state, segsBold(segs), 11, 16, 6, 16)
        break
      case 'p':
        renderizarParagrafo(state, segs, 10.5, 15, 6)
        break
      case 'ul':
        listaTipo = 'ul'
        listaContador = 0
        for (const child of el.childNodes) processarNo(child)
        listaTipo = null
        state.cursorY -= 4
        break
      case 'ol':
        listaTipo = 'ol'
        listaContador = 0
        for (const child of el.childNodes) processarNo(child)
        listaTipo = null
        state.cursorY -= 4
        break
      case 'li': {
        listaContador++
        const marcador = listaTipo === 'ol' ? `${listaContador}. ` : '• '
        renderizarParagrafo(
          state,
          [{ texto: marcador, bold: false, italic: false }, ...segs],
          10.5,
          15,
          4,
          24
        )
        break
      }
      case 'blockquote':
        renderizarParagrafo(state, segs.map((s) => ({ ...s, italic: true })), 10.5, 15, 6, 24)
        break
      case 'br':
        state.cursorY -= 6
        break
      default:
        for (const child of el.childNodes) processarNo(child)
    }
  }

  for (const child of root.firstChild?.childNodes ?? []) processarNo(child)
}

export type { RenderState }
