import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import { renderizarHtmlNoPdf, type RenderState } from './render-html-pdf'

interface BuildOptions {
  titulo: string
  numero: string
  conteudo: string // HTML ou texto plano (com placeholders já substituídos)
  cliente: {
    razao_social: string
    cnpj: string
    endereco?: string
  }
  contratante: {
    razao_social: string
    cnpj: string
  }
  resumoComercial?: Array<{ label: string; valor: string }>
  dataLocal: string
}

const COR_PRIMARIA = rgb(13 / 255, 27 / 255, 62 / 255)
const COR_SECUNDARIA = rgb(138 / 255, 154 / 255, 181 / 255)
const COR_TEXTO = rgb(13 / 255, 27 / 255, 62 / 255)

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50

function pintarHeader(page: PDFPage, font: PDFFont, bold: PDFFont, numero: string) {
  page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: COR_PRIMARIA })
  page.drawText('VERTEX', { x: MARGIN, y: PAGE_H - 45, size: 22, font: bold, color: rgb(1, 1, 1) })
  page.drawText('BPO e Assessoria Empresarial', {
    x: MARGIN,
    y: PAGE_H - 62,
    size: 9,
    font,
    color: rgb(0.8, 0.85, 0.95),
  })
  page.drawText(`Nº ${numero}`, {
    x: PAGE_W - MARGIN - 100,
    y: PAGE_H - 45,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  })
}

function escreverLinha(
  state: RenderState,
  texto: string,
  opts: { size?: number; bold?: boolean; cor?: ReturnType<typeof rgb>; gap?: number } = {}
) {
  const { size = 10, bold = false, cor = COR_TEXTO, gap = 4 } = opts
  const f = bold ? state.bold : state.font
  if (state.cursorY - size * 1.4 < state.marginBottom) {
    state.page = state.doc.addPage([PAGE_W, PAGE_H])
    state.cursorY = PAGE_H - MARGIN
  }
  state.page.drawText(texto, {
    x: MARGIN,
    y: state.cursorY - size,
    size,
    font: f,
    color: cor,
  })
  state.cursorY -= size * 1.4 + gap
}

export async function gerarPdf(opts: BuildOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique)

  const firstPage = doc.addPage([PAGE_W, PAGE_H])
  pintarHeader(firstPage, font, bold, opts.numero)

  const state: RenderState = {
    doc,
    page: firstPage,
    cursorY: PAGE_H - 110,
    font,
    bold,
    italic,
    boldItalic,
    pageWidth: PAGE_W,
    pageHeight: PAGE_H,
    margin: MARGIN,
    marginBottom: MARGIN,
  }

  escreverLinha(state, opts.titulo, { size: 18, bold: true, gap: 16 })

  escreverLinha(state, 'CONTRATADA', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 2 })
  escreverLinha(state, opts.contratante.razao_social, { size: 11, bold: true })
  escreverLinha(state, `CNPJ ${opts.contratante.cnpj}`, { size: 10, gap: 12 })

  escreverLinha(state, 'CONTRATANTE', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 2 })
  escreverLinha(state, opts.cliente.razao_social, { size: 11, bold: true })
  escreverLinha(state, `CNPJ ${opts.cliente.cnpj}`, { size: 10 })
  if (opts.cliente.endereco) escreverLinha(state, opts.cliente.endereco, { size: 10, gap: 16 })
  else state.cursorY -= 12

  if (opts.resumoComercial?.length) {
    escreverLinha(state, 'RESUMO COMERCIAL', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 4 })
    for (const item of opts.resumoComercial) {
      escreverLinha(state, `${item.label}: ${item.valor}`, { size: 10, gap: 2 })
    }
    state.cursorY -= 12
  }

  escreverLinha(state, 'ESCOPO E CONDIÇÕES', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 6 })

  // Conteúdo principal (HTML formatado ou texto)
  renderizarHtmlNoPdf(state, opts.conteudo)

  // Assinatura
  if (state.cursorY < MARGIN + 120) {
    state.page = doc.addPage([PAGE_W, PAGE_H])
    state.cursorY = PAGE_H - MARGIN
  }
  state.cursorY -= 24
  escreverLinha(state, opts.dataLocal, { size: 11, gap: 32 })
  escreverLinha(state, '_______________________________________', { size: 10, gap: 4 })
  escreverLinha(state, opts.contratante.razao_social, { size: 11, bold: true })
  escreverLinha(state, `CNPJ ${opts.contratante.cnpj}`, { size: 9 })

  // Paginação
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    p.drawText(`Página ${i + 1} de ${pages.length}`, {
      x: PAGE_W - MARGIN - 90,
      y: MARGIN / 2,
      size: 8,
      font,
      color: COR_SECUNDARIA,
    })
  })

  return await doc.save()
}
