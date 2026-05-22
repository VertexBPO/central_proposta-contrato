/**
 * Aplica alpha 30% em imagens marcadas como watermark dentro do .docx.
 *
 * LibreOffice (engine do CloudConvert) ignora os atributos de "Washout" do Word
 * (gain/blacklevel em VML, a:lum em DrawingML), então a transparência precisa estar
 * embutida no pixel da imagem.
 *
 * Estratégia:
 * 1. Lê todos os word/header*.xml
 * 2. Identifica elementos de watermark (gain/blacklevel/lum)
 * 3. Pra cada watermark único, gera uma cópia da imagem com alpha 30% baked-in
 * 4. Adiciona um novo Relationship apontando pra cópia
 * 5. Atualiza o XML do header pra usar o novo rId
 *
 * O original (header logo, por exemplo) fica intacto.
 */
import JSZip from 'jszip'
import sharp from 'sharp'

export async function aplicarAlphaNasWatermarks(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer)

  const headerPaths = Object.keys(zip.files).filter((n) => /^word\/header\d+\.xml$/.test(n))

  for (const headerPath of headerPaths) {
    const headerFile = zip.file(headerPath)
    if (!headerFile) continue
    let headerXml = await headerFile.async('string')

    const headerName = headerPath.split('/').pop()
    const relsPath = `word/_rels/${headerName}.rels`
    const relsFile = zip.file(relsPath)
    if (!relsFile) continue
    let relsXml = await relsFile.async('string')

    const rIdToTarget: Record<string, string> = {}
    const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g
    let m: RegExpExecArray | null
    while ((m = relRegex.exec(relsXml)) !== null) {
      rIdToTarget[m[1]] = m[2]
    }

    const watermarkRIds = new Set<string>()

    // VML: <v:imagedata r:id="rIdX" gain="..." blacklevel="..."/>
    const vmlRegex = /<v:imagedata\s+([^/>]+)\/?>/g
    while ((m = vmlRegex.exec(headerXml)) !== null) {
      const attrs = m[1]
      if (attrs.includes('gain=') || attrs.includes('blacklevel=')) {
        const ridMatch = attrs.match(/r:id="([^"]+)"/)
        if (ridMatch) watermarkRIds.add(ridMatch[1])
      }
    }

    // DrawingML: <a:blip r:embed="rIdX">...<a:lum bright="..." contrast="..."/>...</a:blip>
    const blipRegex = /<a:blip\s+([^>]*?)>([\s\S]*?)<\/a:blip>/g
    while ((m = blipRegex.exec(headerXml)) !== null) {
      if (m[2].includes('a:lum')) {
        const embedMatch = m[1].match(/r:embed="([^"]+)"/)
        if (embedMatch) watermarkRIds.add(embedMatch[1])
      }
    }

    if (watermarkRIds.size === 0) continue

    // Pra cada watermark, cria cópia com alpha aplicado
    const oldToNewRid: Record<string, string> = {}
    let suffix = 0
    for (const rId of watermarkRIds) {
      const target = rIdToTarget[rId]
      if (!target) continue

      const imagePath = target.startsWith('/') ? target.slice(1) : `word/${target}`
      const imageFile = zip.file(imagePath)
      if (!imageFile) continue

      const imageBuffer = await imageFile.async('nodebuffer')

      let modified: Buffer
      try {
        modified = await sharp(imageBuffer)
          .ensureAlpha()
          .composite([
            {
              input: {
                create: {
                  width: 1,
                  height: 1,
                  channels: 4,
                  background: { r: 0, g: 0, b: 0, alpha: 0.3 },
                },
              },
              tile: true,
              blend: 'dest-in',
            },
          ])
          .png()
          .toBuffer()
      } catch {
        continue
      }

      suffix += 1
      const newImagePath = imagePath.replace(/\.[^.]+$/, `_wm${suffix}.png`)
      zip.file(newImagePath, modified)

      const newRId = `rIdWM${suffix}${Math.random().toString(36).slice(2, 6)}`
      const newTarget = newImagePath.startsWith('word/') ? newImagePath.slice(5) : newImagePath

      relsXml = relsXml.replace(
        /<\/Relationships>/,
        `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${newTarget}"/></Relationships>`,
      )

      oldToNewRid[rId] = newRId
    }

    if (Object.keys(oldToNewRid).length === 0) continue

    // Atualiza o XML do header: troca r:id e r:embed apenas dentro de blocos de watermark.
    // Como rIds são locais ao header e a watermark normalmente usa um rId exclusivo, podemos trocar globalmente.
    for (const [oldRid, newRid] of Object.entries(oldToNewRid)) {
      headerXml = headerXml.replace(new RegExp(`r:id="${oldRid}"`, 'g'), `r:id="${newRid}"`)
      headerXml = headerXml.replace(new RegExp(`r:embed="${oldRid}"`, 'g'), `r:embed="${newRid}"`)
    }

    zip.file(headerPath, headerXml)
    zip.file(relsPath, relsXml)
  }

  return await zip.generateAsync({ type: 'nodebuffer' })
}
