// Cliente CloudConvert — converte .docx em PDF preservando formatação 100% do Word.
// Fluxo: cria job com 3 tasks (upload + convert + export). Faz polling até finalizar.
// Doc: https://cloudconvert.com/api/v2

interface TaskBase {
  id: string
  name: string
  status: 'waiting' | 'processing' | 'finished' | 'error'
  result?: {
    form?: { url: string; parameters: Record<string, string> }
    files?: Array<{ filename: string; url: string }>
  }
  message?: string
}

interface JobResponse {
  data: {
    id: string
    status: 'waiting' | 'processing' | 'finished' | 'error'
    tasks: TaskBase[]
  }
}

const API = 'https://api.cloudconvert.com/v2'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY
  if (!apiKey) throw new Error('CLOUDCONVERT_API_KEY ausente')
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CloudConvert ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Converte um buffer .docx em buffer .pdf via CloudConvert.
 */
export async function docxParaPdf(docxBuffer: Buffer, nomeArquivo = 'documento.docx'): Promise<Buffer> {
  // 1) Cria job com 3 tasks
  const jobResp = await api<JobResponse>('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      tasks: {
        'import-1': {
          operation: 'import/upload',
        },
        'convert-1': {
          operation: 'convert',
          input: 'import-1',
          output_format: 'pdf',
          input_format: 'docx',
          engine: 'libreoffice',
        },
        'export-1': {
          operation: 'export/url',
          input: 'convert-1',
        },
      },
      tag: 'central-propostas-vertex',
    }),
  })

  const jobId = jobResp.data.id
  const uploadTask = jobResp.data.tasks.find((t) => t.name === 'import-1')
  if (!uploadTask?.result?.form) throw new Error('Upload form não retornado')

  // 2) Faz upload do .docx
  const form = new FormData()
  for (const [k, v] of Object.entries(uploadTask.result.form.parameters)) {
    form.append(k, v)
  }
  const blob = new Blob([new Uint8Array(docxBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  form.append('file', blob, nomeArquivo)

  const uploadRes = await fetch(uploadTask.result.form.url, { method: 'POST', body: form })
  if (!uploadRes.ok) {
    const t = await uploadRes.text()
    throw new Error(`Upload falhou: ${uploadRes.status} ${t}`)
  }

  // 3) Polling até job finalizar
  const inicio = Date.now()
  const TIMEOUT_MS = 60_000
  let exportTask: TaskBase | undefined

  while (Date.now() - inicio < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1500))
    const status = await api<JobResponse>(`/jobs/${jobId}`)

    if (status.data.status === 'error') {
      const errored = status.data.tasks.find((t) => t.status === 'error')
      throw new Error(`Job falhou: ${errored?.message ?? 'desconhecido'}`)
    }

    if (status.data.status === 'finished') {
      exportTask = status.data.tasks.find((t) => t.name === 'export-1')
      break
    }
  }

  if (!exportTask?.result?.files?.[0]) {
    throw new Error('Timeout aguardando conversão CloudConvert')
  }

  // 4) Baixa o PDF
  const pdfUrl = exportTask.result.files[0].url
  const pdfRes = await fetch(pdfUrl)
  if (!pdfRes.ok) throw new Error(`Download PDF falhou: ${pdfRes.status}`)
  const arrayBuffer = await pdfRes.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
