/**
 * Aplica alpha 10% em imagens marcadas como watermark dentro do .docx.
 *
 * LibreOffice (engine do CloudConvert) ignora vários atributos do Word
 * (gain/blacklevel, a:lum, a:alphaModFix), então a transparência precisa
 * estar embutida no pixel da imagem.
 *
 * Detecção (qualquer um dos critérios faz a imagem virar watermark):
 *  - Dentro de <w:pict> (formato VML legado, usado pelo menu Marca d'Água do Word)
 *  - Dentro de <wp:anchor behindDoc="1"> (imagem atrás do texto)
 *  - Com <a:lum> ou <a:alphaModFix> (transparência explícita)
 *  - Com atributo gain/blacklevel em <v:imagedata>
 *
 * Pra cada watermark única, gera uma cópia do PNG com alpha 30% baked-in e
 * substitui o rId no XML. Header logo (inline normal) fica intacto.
 */
import JSZip from 'jszip'
import sharp from 'sharp'

export async function aplicarAlphaNasWatermarks(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer)

  const xmlPaths = Object.keys(zip.files).filter(
    (n) =>
      n === 'word/document.xml' ||
      /^word\/header\d+\.xml$/.test(n) ||
      /^word\/footer\d+\.xml$/.test(n),
  )

  let totalProcessadas = 0

  for (const xmlPath of xmlPaths) {
    const xmlFile = zip.file(xmlPath)
    if (!xmlFile) continue
    let xml = await xmlFile.async('string')

    const xmlName = xmlPath.split('/').pop()!
    const relsPath = `word/_rels/${xmlName}.rels`
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

    // 1. Qualquer imagem dentro de <w:pict> (formato VML legado / menu Marca d'Água)
    const pictRegex = /<w:pict>([\s\S]*?)<\/w:pict>/g
    while ((m = pictRegex.exec(xml)) !== null) {
      const ridMatches = m[1].matchAll(/r:id="([^"]+)"/g)
      for (const rm of ridMatches) watermarkRIds.add(rm[1])
    }

    // 2. Imagens em <wp:anchor behindDoc="1"> (imagem atrás do texto - moderno)
    const anchorRegex = /<wp:anchor[^>]*behindDoc="1"[^>]*>([\s\S]*?)<\/wp:anchor>/g
    while ((m = anchorRegex.exec(xml)) !== null) {
      const ridMatches = m[1].matchAll(/r:embed="([^"]+)"/g)
      for (const rm of ridMatches) watermarkRIds.add(rm[1])
    }

    // 3. <a:blip> com <a:lum> ou <a:alphaModFix> (transparência explícita)
    const blipRegex = /<a:blip\s+([^>]*?)>([\s\S]*?)<\/a:blip>/g
    while ((m = blipRegex.exec(xml)) !== null) {
      if (m[2].includes('a:lum') || m[2].includes('a:alphaModFix')) {
        const embedMatch = m[1].match(/r:embed="([^"]+)"/)
        if (embedMatch) watermarkRIds.add(embedMatch[1])
      }
    }

    // 4. <v:imagedata gain="..." blacklevel="..."/> (washout VML clássico)
    const vmlRegex = /<v:imagedata\s+([^/>]+)\/?>/g
    while ((m = vmlRegex.exec(xml)) !== null) {
      const attrs = m[1]
      if (attrs.includes('gain=') || attrs.includes('blacklevel=')) {
        const ridMatch = attrs.match(/r:id="([^"]+)"/)
        if (ridMatch) watermarkRIds.add(ridMatch[1])
      }
    }

    if (watermarkRIds.size === 0) continue

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
                  background: { r: 0, g: 0, b: 0, alpha: 0.1 },
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
      const newTarget = newImagePath.startsWith('word/')
        ? newImagePath.slice(5)
        : newImagePath

      relsXml = relsXml.replace(
        /<\/Relationships>/,
        `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${newTarget}"/></Relationships>`,
      )

      oldToNewRid[rId] = newRId
      totalProcessadas += 1
    }

    if (Object.keys(oldToNewRid).length === 0) continue

    for (const [oldRid, newRid] of Object.entries(oldToNewRid)) {
      xml = xml.replace(new RegExp(`r:id="${oldRid}"`, 'g'), `r:id="${newRid}"`)
      xml = xml.replace(new RegExp(`r:embed="${oldRid}"`, 'g'), `r:embed="${newRid}"`)
    }

    zip.file(xmlPath, xml)
    zip.file(relsPath, relsXml)
  }

  void totalProcessadas
  return await zip.generateAsync({ type: 'nodebuffer' })
}
