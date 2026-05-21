import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const SCREENSHOT_DIR = './Telas App'

async function run() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const erros = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => erros.push(`[pageerror] ${err.message}`))

  console.log('1. Abrindo /login...')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true })
  console.log('   Screenshot salvo: 01-login.png')

  console.log('2. Preenchendo credenciais...')
  await page.fill('input[type="email"]', 's.alves@vertexbpo.com.br')
  await page.fill('input[type="password"]', 'Vertex@2026')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-login-preenchido.png`, fullPage: true })

  console.log('3. Submetendo login...')
  await page.click('button[type="submit"]')

  console.log('4. Aguardando redirect para /dashboard...')
  try {
    await page.waitForURL('**/dashboard', { timeout: 8000 })
    console.log('   ✓ Redirecionou para:', page.url())
  } catch (e) {
    console.log('   ✗ Falhou redirect. URL atual:', page.url())
    const erro = await page.locator('div').filter({ hasText: 'E-mail ou senha' }).first().textContent().catch(() => null)
    if (erro) console.log('   Mensagem:', erro)
  }

  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-dashboard.png`, fullPage: true })
  console.log('   Screenshot salvo: 03-dashboard.png')

  console.log('5. Testando logout...')
  await page.click('button:has-text("Sair")')
  await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {})
  console.log('   URL após logout:', page.url())

  console.log('\nERROS DE CONSOLE/PÁGINA:')
  if (erros.length === 0) console.log('   nenhum')
  else erros.forEach((e) => console.log(' -', e))

  await browser.close()
}

run().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
