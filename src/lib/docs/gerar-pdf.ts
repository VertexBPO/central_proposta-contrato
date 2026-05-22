import { PDFDocument, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { renderizarHtmlNoPdf, type RenderState } from './render-html-pdf'

interface BuildOptions {
  titulo: string
  numero: string
  conteudo: string
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
const COR_TEXTO = rgb(0, 0, 0)

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')

async function carregarFontes(doc: PDFDocument) {
  doc.registerFontkit(fontkit)
  const [light, lightItalic, bold, boldItalic] = await Promise.all([
    readFile(path.join(FONT_DIR, 'Calibri-Light.ttf')),
    readFile(path.join(FONT_DIR, 'Calibri-Italic.ttf')),
    readFile(path.join(FONT_DIR, 'Calibri-Bold.ttf')),
    readFile(path.join(FONT_DIR, 'Calibri-BoldItalic.ttf')),
  ])
  return {
    light: await doc.embedFont(light, { subset: true }),
    lightItalic: await doc.embedFont(lightItalic, { subset: true }),
    bold: await doc.embedFont(bold, { subset: true }),
    boldItalic: await doc.embedFont(boldItalic, { subset: true }),
  }
}

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
  const { size = 10.5, bold = false, cor = COR_TEXTO, gap = 4 } = opts
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
  const fonts = await carregarFontes(doc)
  const { light, lightItalic, bold, boldItalic } = fonts

  const firstPage = doc.addPage([PAGE_W, PAGE_H])
  pintarHeader(firstPage, light, bold, opts.numero)

  const state: RenderState = {
    doc,
    page: firstPage,
    cursorY: PAGE_H - 110,
    font: light,
    bold,
    italic: lightItalic,
    boldItalic,
    pageWidth: PAGE_W,
    pageHeight: PAGE_H,
    margin: MARGIN,
    marginBottom: MARGIN,
  }

  // Título principal — 18, bold, centralizado seria ideal, mas mantemos left por simplicidade
  escreverLinha(state, opts.titulo, { size: 18, bold: true, gap: 16 })

  // Partes
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
      escreverLinha(state, `${item.label}: ${item.valor}`, { size: 10.5, gap: 2 })
    }
    state.cursorY -= 12
  }

  // Conteúdo formatado
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
      font: light,
      color: COR_SECUNDARIA,
    })
  })

  return await doc.save()
}
