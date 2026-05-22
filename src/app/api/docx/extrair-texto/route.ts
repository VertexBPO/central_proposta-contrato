import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

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
    const result = await mammoth.extractRawText({ buffer })

    return NextResponse.json({
      texto: result.value.trim(),
      avisos: result.messages.map((m) => m.message),
    })
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : 'Falha ao processar arquivo.' },
      { status: 500 }
    )
  }
}
