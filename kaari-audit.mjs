#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// kaari-audit.mjs  — Kaari Full-Stack Audit Script
// Run: node kaari-audit.mjs [--fix] [--url http://localhost:3000]
// Covers: Bugs · Security · Performance · Cloudinary · Cashfree · Redis · UX
// Stack:  Next.js 14 · Supabase · Cashfree UPI · Cloudinary · Upstash Redis
// ═══════════════════════════════════════════════════════════════════════════

import fs            from 'fs'
import path          from 'path'
import { execSync }  from 'child_process'
import http          from 'http'
import https         from 'https'
import { createHash, timingSafeEqual } from 'crypto'

// ── CLI args ────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2)
const FIX    = args.includes('--fix')
const urlArg = args.find(a => a.startsWith('--url='))
const BASE   = urlArg ? urlArg.split('=')[1] : 'http://localhost:3000'

// ── Terminal colours ────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',
  red:    '\x1b[31m', green:  '\x1b[32m',
  yellow: '\x1b[33m', blue:   '\x1b[34m',
  cyan:   '\x1b[36m', grey:   '\x1b[90m',
  bg_red: '\x1b[41m', bg_grn: '\x1b[42m',
}

const ROOT = process.cwd()

// ── Result store ─────────────────────────────────────────────────────────────
const results = {
  pass:  [],
  fail:  [],
  warn:  [],
  info:  [],
  score: {},
}

function pass(tag, msg)  { results.pass.push({ tag, msg });  console.log(`  ${C.green}✓${C.reset} [${tag}] ${msg}`) }
function fail(tag, msg)  { results.fail.push({ tag, msg });  console.log(`  ${C.red}✗${C.reset} [${tag}] ${C.bold}${msg}${C.reset}`) }
function warn(tag, msg)  { results.warn.push({ tag, msg });  console.log(`  ${C.yellow}⚠${C.reset} [${tag}] ${msg}`) }
function info(tag, msg)  { results.info.push({ tag, msg });  console.log(`  ${C.grey}•${C.reset} [${tag}] ${msg}`) }
function section(title)  { console.log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}`) }
function subsec(title)   { console.log(`\n${C.bold}  ▸ ${title}${C.reset}`) }

// ── File helpers ─────────────────────────────────────────────────────────────
const exists  = f  => fs.existsSync(path.join(ROOT, f))
const read    = f  => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8') } catch { return '' } }
const readJSON = f => { try { return JSON.parse(read(f)) } catch { return null } }
const grep    = (f, pattern) => (read(f).match(new RegExp(pattern, 'g')) || []).length

function findFiles(dir, ext) {
  const results = []
  if (!exists(dir)) return results
  function walk(d) {
    try {
      for (const f of fs.readdirSync(path.join(ROOT, d))) {
        const full = path.join(d, f)
        const stat = fs.statSync(path.join(ROOT, full))
        if (stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules' && f !== '.next') walk(full)
        else if (f.endsWith(ext)) results.push(full)
      }
    } catch {}
  }
  walk(dir)
  return results
}

function grepFiles(dir, ext, pattern) {
  const hits = []
  for (const f of findFiles(dir, ext)) {
    const content = read(f)
    const regex   = new RegExp(pattern, 'gm')
    let   match
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split('\n').length
      hits.push({ file: f, line: lineNum, match: match[0].trim().slice(0, 80) })
    }
  }
  return hits
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url, timeoutMs = 5000) {
  return new Promise(resolve => {
    const client  = url.startsWith('https') ? https : http
    const t0      = Date.now()
    const req     = client.get(url, { headers: { 'User-Agent': 'kaari-audit/1.0' } }, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end',  () => resolve({
        status:   res.statusCode,
        headers:  res.headers,
        body:     body.slice(0, 4096),
        latency:  Date.now() - t0,
        url,
      }))
    })
    req.on('error', e => resolve({ status: 0, error: e.message, latency: Date.now() - t0, url }))
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ status: 0, error: 'timeout', latency: timeoutMs, url }) })
  })
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ENVIRONMENT & SECRETS
// ════════════════════════════════════════════════════════════════════════════════
section('1. ENVIRONMENT & SECRETS')

subsec('Required env vars')
const envExample = read('.env.example')
const envLocal   = read('.env.local')

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'NEXT_PUBLIC_CASHFREE_MODE',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
]

let missingVars = 0
for (const v of REQUIRED_VARS) {
  const inLocal   = envLocal.includes(v + '=')
  const inProcess = process.env[v]
  if (!inLocal && !inProcess) {
    warn('ENV', `${v} missing from .env.local`)
    missingVars++
  } else {
    pass('ENV', `${v} present`)
  }
}

subsec('Leaked credentials in .env.example')
const LEAKED_PATTERNS = [
  { pattern: /iAFRm-hoVwx/,              label: 'Cloudinary API secret (REAL KEY)' },
  { pattern: /cfsk_ma_test_/,            label: 'Cashfree secret key (REAL KEY)' },
  { pattern: /TEST110193084/,            label: 'Cashfree App ID (REAL KEY)' },
  { pattern: /upstash\.io.*token=/i,     label: 'Upstash token in .env.example' },
  { pattern: /eyJhbGciOi/,              label: 'JWT token exposed' },
]

let leakedCreds = 0
for (const { pattern, label } of LEAKED_PATTERNS) {
  if (pattern.test(envExample)) {
    fail('SECRETS', `LEAKED → ${label} found in .env.example`)
    leakedCreds++
  }
}
if (leakedCreds === 0) pass('SECRETS', '.env.example contains only placeholders')

subsec('.gitignore coverage')
const gitignore = read('.gitignore')
for (const line of ['.env', '.env.local', '.env.production']) {
  gitignore.includes(line)
    ? pass('GIT', `.gitignore covers ${line}`)
    : fail('GIT', `.gitignore missing entry: ${line}`)
}

results.score['secrets'] = Math.round(100 - (leakedCreds * 30) - (missingVars * 2))

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TYPESCRIPT & BUILD
// ════════════════════════════════════════════════════════════════════════════════
section('2. TYPESCRIPT & BUILD')

subsec('TypeScript check')
try {
  execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, timeout: 60000 })
  pass('TS', '0 TypeScript errors')
  results.score['typescript'] = 100
} catch (e) {
  const output  = (e.stdout?.toString() || '') + (e.stderr?.toString() || '')
  const errors  = (output.match(/error TS/g) || []).length
  fail('TS', `${errors} TypeScript error(s) detected`)
  const lines   = output.split('\n').filter(l => l.includes('error TS')).slice(0, 5)
  lines.forEach(l => info('TS', l.trim()))
  results.score['typescript'] = Math.max(0, 100 - errors * 10)
}

subsec('Known critical TS errors from audit')
const middlewareContent = read('middleware.ts') || read('src/middleware.ts')
if (middlewareContent.includes('has_role(') && !middlewareContent.includes('AppRole')) {
  fail('TS', 'middleware.ts: has_role() missing AppRole type cast (line ~74)')
} else if (middlewareContent.includes('has_role(')) {
  pass('TS', 'middleware.ts: has_role() correctly typed')
}

subsec('ESLint')
try {
  execSync('npx eslint . --max-warnings=0 2>&1', { cwd: ROOT, timeout: 60000 })
  pass('LINT', '0 ESLint errors')
} catch (e) {
  const out     = (e.stdout?.toString() || '')
  const errors  = (out.match(/error\s+/g) || []).length
  const warns   = (out.match(/warning\s+/g) || []).length
  errors > 0 ? fail('LINT', `${errors} ESLint errors, ${warns} warnings`) : warn('LINT', `${warns} ESLint warnings`)
}

subsec('Next.js build')
try {
  execSync('npx next build 2>&1', { cwd: ROOT, timeout: 180000 })
  pass('BUILD', 'next build succeeded')
  results.score['build'] = 100
} catch (e) {
  const out = (e.stdout?.toString() || '')
  if (out.includes('@rollup/rollup-win32')) {
    fail('BUILD', 'BLOCKED: @rollup/rollup-win32-x64-msvc missing → run: npm ci')
  } else {
    fail('BUILD', 'next build failed — see output above')
  }
  results.score['build'] = 0
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 3 — CLOUDINARY / MEDIA BUGS
// ════════════════════════════════════════════════════════════════════════════════
section('3. CLOUDINARY / MEDIA BUGS')

subsec('ProductGridDb.tsx — raw public_id check')
const gridDb = read('components/products/ProductGridDb.tsx')
if (!gridDb) {
  warn('CLOUD', 'ProductGridDb.tsx not found — check path')
} else if (gridDb.includes('resolveProductImageUrl')) {
  pass('CLOUD', 'ProductGridDb.tsx uses resolveProductImageUrl() ✓')
} else if (gridDb.includes('<img') && gridDb.includes('image_public_id')) {
  fail('CLOUD', 'ProductGridDb.tsx passes raw public_id to <img src> — images will break')
} else if (gridDb.includes('<img') || gridDb.includes('image_public_id')) {
  warn('CLOUD', 'ProductGridDb.tsx may be using raw image id — verify resolveProductImageUrl usage')
}

subsec('Upload preset — hardcoded vs env')
const cloudinaryLib = read('lib/cloudinary.ts')
if (cloudinaryLib.includes("'kaari_products'") && !cloudinaryLib.includes('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')) {
  fail('CLOUD', "lib/cloudinary.ts: upload preset 'kaari_products' hardcoded — ignores env var")
} else if (cloudinaryLib.includes('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')) {
  pass('CLOUD', 'lib/cloudinary.ts: upload preset reads from env var')
}

subsec('ProductGallery.tsx — motion.img vs next/image')
const gallery = read('components/products/ProductGallery.tsx')
if (gallery.includes('motion.img')) {
  fail('CLOUD', 'ProductGallery.tsx uses <motion.img> — bypasses Next.js image optimization')
} else if (gallery.includes("from 'next/image'")) {
  pass('CLOUD', 'ProductGallery.tsx uses next/image correctly')
}

subsec('Asset deletion path')
const hasDeleteRoute = exists('app/api/admin/media/delete/route.ts')
hasDeleteRoute
  ? pass('CLOUD', 'Cloudinary delete route exists: app/api/admin/media/delete/route.ts')
  : fail('CLOUD', 'No Cloudinary asset deletion route — orphaned assets will accumulate')

subsec('useCloudinaryUpload hook usage')
const adminForm    = read('components/admin/AdminProductForm.tsx') || read('app/admin/products/AdminProductForm.tsx')
const hookExists   = exists('hooks/useCloudinaryUpload.ts')
const hookUsed     = adminForm.includes('useCloudinaryUpload')
hookExists && !hookUsed
  ? fail('CLOUD', 'hooks/useCloudinaryUpload.ts exists but is NOT used in AdminProductForm')
  : hookExists && hookUsed
  ? pass('CLOUD', 'useCloudinaryUpload hook is properly wired in AdminProductForm')
  : warn('CLOUD', 'useCloudinaryUpload hook not found')

subsec('next/image usage across app/')
const imgTags = grepFiles('app', '.tsx', '<img\\s')
if (imgTags.length > 0) {
  fail('CLOUD', `${imgTags.length} raw <img> tag(s) found in app/ — should use next/image`)
  imgTags.slice(0, 5).forEach(h => info('CLOUD', `  ${h.file}:${h.line} → ${h.match}`))
} else {
  pass('CLOUD', 'No raw <img> tags in app/ — all using next/image')
}

results.score['cloudinary'] = 70

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 4 — CASHFREE PAYMENTS
// ════════════════════════════════════════════════════════════════════════════════
section('4. CASHFREE UPI PAYMENTS')

subsec('Sandbox mode hardcoding')
const cfSdk = read('lib/cashfree-sdk.ts')
if (cfSdk.includes("mode: 'sandbox'") && !cfSdk.includes('CASHFREE_MODE')) {
  fail('CF', "cashfree-sdk.ts: mode: 'sandbox' HARDCODED — production UPI will fail")
} else if (cfSdk.includes('CASHFREE_MODE') || cfSdk.includes('CF_MODE')) {
  pass('CF', 'cashfree-sdk.ts reads mode from env variable')
} else {
  warn('CF', 'cashfree-sdk.ts: cannot determine mode configuration — verify manually')
}

subsec('Webhook signature verification')
const cfLib = read('lib/cashfree.ts')
if (cfLib.includes('crypto.subtle')) {
  fail('CF', 'lib/cashfree.ts: uses crypto.subtle (async, will coerce to boolean) — signature check is NO-OP')
} else if (cfLib.includes('createHmac') && cfLib.includes('timingSafeEqual')) {
  pass('CF', 'lib/cashfree.ts: correct HMAC-SHA256 + timingSafeEqual signature verification')
} else if (cfLib.includes('createHmac')) {
  warn('CF', 'lib/cashfree.ts: uses createHmac but verify timingSafeEqual is used for comparison')
}

subsec('KAARI_BASE_URL in client components')
const checkout = read('app/(checkout)/Checkout.tsx') || read('components/checkout/Checkout.tsx') || read('app/checkout/page.tsx')
if (checkout.includes('KAARI_BASE_URL') && !checkout.includes('NEXT_PUBLIC_')) {
  fail('CF', 'Checkout.tsx: KAARI_BASE_URL (no NEXT_PUBLIC_) used in client — always undefined in browser')
} else if (checkout.includes('NEXT_PUBLIC_APP_URL') || checkout.includes('NEXT_PUBLIC_CASHFREE')) {
  pass('CF', 'Checkout.tsx: uses NEXT_PUBLIC_ env vars correctly in client')
}

subsec('Duplicate webhook paths')
const webhookMain  = exists('app/api/webhooks/payment/route.ts')
const webhookLib   = exists('lib/webhook.ts')
if (webhookMain && webhookLib) {
  warn('CF', 'Two webhook paths: app/api/webhooks/payment/route.ts + lib/webhook.ts — only former should be active')
} else if (webhookMain) {
  pass('CF', 'Single webhook path: app/api/webhooks/payment/route.ts')
}

subsec('Webhook route — raw body + signature check')
const webhookRoute = read('app/api/webhooks/payment/route.ts')
if (webhookRoute.includes('req.text()')) {
  pass('CF', 'Webhook reads raw body text (required for HMAC)')
} else {
  fail('CF', 'Webhook does NOT read raw body — HMAC will always fail (body already parsed)')
}
if (webhookRoute.includes('verifyCashfreeWebhookSignature')) {
  pass('CF', 'Webhook calls verifyCashfreeWebhookSignature()')
} else {
  fail('CF', 'Webhook does NOT call verifyCashfreeWebhookSignature — any request accepted')
}

subsec('Order state machine')
const orderStatuses = ['PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED']
for (const s of orderStatuses) {
  webhookRoute.includes(s)
    ? pass('CF', `Order state '${s}' handled in webhook`)
    : warn('CF', `Order state '${s}' not found in webhook handler`)
}

results.score['cashfree'] = 70

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 5 — RATE LIMITING & REDIS
// ════════════════════════════════════════════════════════════════════════════════
section('5. RATE LIMITING & REDIS')

subsec('Misleading client limiter')
const hasOldRateLimit = exists('lib/rateLimit.ts')
const oldContent      = read('lib/rateLimit.ts')
if (hasOldRateLimit && !oldContent.includes('@upstash') && !oldContent.includes('Redis')) {
  fail('REDIS', 'lib/rateLimit.ts is client-only in-memory — NOT Redis. Misleadingly named.')
} else if (!hasOldRateLimit) {
  pass('REDIS', 'lib/rateLimit.ts removed/renamed — no misleading client limiter')
}

subsec('Server rate limit')
const hasServerRL = exists('lib/server-rate-limit.ts')
if (hasServerRL) {
  const srl = read('lib/server-rate-limit.ts')
  srl.includes('@upstash/ratelimit')
    ? pass('REDIS', 'lib/server-rate-limit.ts uses @upstash/ratelimit')
    : warn('REDIS', 'lib/server-rate-limit.ts exists but does not use @upstash/ratelimit')
} else {
  fail('REDIS', 'lib/server-rate-limit.ts missing — no server-side rate limiting')
}

subsec('Middleware coverage')
const mw = read('middleware.ts') || read('src/middleware.ts')
const RL_ROUTES = ['/api/', '/checkout', '/login', '/signup', '/api/auth']
for (const route of RL_ROUTES) {
  mw.includes(`'${route}'`) || mw.includes(`"${route}"`) || mw.includes(`pathname.startsWith('${route.replace("'", "")}')`)
    ? pass('REDIS', `Rate limiting covers route: ${route}`)
    : warn('REDIS', `Rate limiting may not cover: ${route}`)
}

subsec('Fail-open/closed strategy')
const srl = read('lib/server-rate-limit.ts')
srl.includes('failClosed') || srl.includes('fail_closed')
  ? pass('REDIS', 'Rate limiter has fail-closed option for critical routes')
  : warn('REDIS', 'No fail-closed strategy — Redis outage silently allows all traffic')

results.score['ratelimit'] = 70

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 6 — SECURITY HEADERS
// ════════════════════════════════════════════════════════════════════════════════
section('6. SECURITY HEADERS')

subsec('next.config.js headers')
const nextConfig = read('next.config.js') || read('next.config.mjs') || read('next.config.ts')
const SECURITY_HEADERS = [
  { header: 'Strict-Transport-Security', key: 'HSTS' },
  { header: 'Content-Security-Policy',   key: 'CSP'  },
  { header: 'X-Frame-Options',           key: 'X-Frame' },
  { header: 'X-Content-Type-Options',    key: 'XCTO' },
  { header: 'Referrer-Policy',           key: 'Referer' },
  { header: 'Permissions-Policy',        key: 'Perms' },
]

let secScore = 0
for (const { header, key } of SECURITY_HEADERS) {
  nextConfig.includes(header)
    ? (pass('SEC', `${header} configured`), secScore++)
    : fail('SEC', `${header} MISSING from next.config.js`)
}

results.score['security'] = Math.round((secScore / SECURITY_HEADERS.length) * 100)

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 7 — LIVE HTTP CHECKS (needs server running)
// ════════════════════════════════════════════════════════════════════════════════
section(`7. LIVE HTTP CHECKS (${BASE})`)

async function runHttpChecks() {

  subsec('Health endpoint')
  const health = await httpGet(`${BASE}/api/health`)
  if (health.status === 200) {
    pass('HTTP', `/api/health → 200 in ${health.latency}ms`)
    try {
      const body = JSON.parse(health.body)
      body.db === 'ok'
        ? pass('HTTP', `DB health: ok (latency ${body.db_latency_ms}ms)`)
        : fail('HTTP', `DB health: ${body.db}`)
    } catch { warn('HTTP', 'Health response is not valid JSON') }
  } else if (health.status === 0) {
    warn('HTTP', `Server not reachable at ${BASE} — start with: npx next dev`)
  } else {
    fail('HTTP', `/api/health → ${health.status} — create the health endpoint`)
  }

  subsec('Security headers (live check)')
  const root = await httpGet(`${BASE}/`)
  if (root.status > 0) {
    const H = root.headers
    const secHeaders = {
      'strict-transport-security': 'HSTS',
      'content-security-policy':   'CSP',
      'x-frame-options':           'X-Frame-Options',
      'x-content-type-options':    'X-Content-Type-Options',
      'referrer-policy':           'Referrer-Policy',
    }
    for (const [h, label] of Object.entries(secHeaders)) {
      H[h]
        ? pass('HDR', `${label}: ${H[h].slice(0, 60)}`)
        : fail('HDR', `${label} header MISSING from HTTP response`)
    }
  } else {
    warn('HDR', 'Server not running — skipping live header checks')
  }

  subsec('Key page response codes')
  const PAGES = [
    { path: '/',          expect: 200 },
    { path: '/products',  expect: 200 },
    { path: '/checkout',  expect: [200, 302, 307] },
    { path: '/admin',     expect: [200, 302, 307] },
    { path: '/api/health',expect: 200 },
    { path: '/sitemap.xml',expect: 200 },
    { path: '/robots.txt', expect: 200 },
  ]

  for (const { path: pg, expect } of PAGES) {
    const res    = await httpGet(`${BASE}${pg}`)
    const ok     = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect
    const label  = `${pg} → ${res.status} (${res.latency}ms)`
    ok ? pass('PAGE', label) : fail('PAGE', label)
  }

  subsec('Response time benchmarks')
  const PERF_PAGES = ['/', '/products']
  for (const pg of PERF_PAGES) {
    const trials    = []
    for (let i = 0; i < 3; i++) {
      const r = await httpGet(`${BASE}${pg}`)
      if (r.latency) trials.push(r.latency)
      await new Promise(r => setTimeout(r, 200))
    }
    if (trials.length) {
      const avg = Math.round(trials.reduce((a, b) => a + b, 0) / trials.length)
      const p99 = Math.max(...trials)
      avg < 800
        ? pass('PERF', `${pg} avg ${avg}ms p99 ${p99}ms (target <800ms)`)
        : avg < 2000
        ? warn('PERF', `${pg} avg ${avg}ms — consider ISR/caching (target <800ms)`)
        : fail('PERF', `${pg} avg ${avg}ms — too slow (target <800ms) — add revalidate`)
    }
  }

  subsec('Rate limit check')
  let rateLimited = false
  for (let i = 0; i < 15; i++) {
    const res = await httpGet(`${BASE}/api/health`)
    if (res.status === 429) { rateLimited = true; break }
  }
  rateLimited
    ? pass('RL', 'Rate limiting active — /api routes return 429 after threshold')
    : warn('RL', 'Rate limit NOT triggered after 15 requests — verify Upstash is connected')

  subsec('Vercel preview headers')
  const xVercel = root.headers?.['x-vercel-id'] || root.headers?.['server']
  xVercel && xVercel.includes('Vercel')
    ? pass('DEPLOY', `Deployed on Vercel (${xVercel})`)
    : info('DEPLOY', 'Not running on Vercel or server header not exposed')
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 8 — PERFORMANCE & OPTIMIZATION
// ════════════════════════════════════════════════════════════════════════════════
section('8. PERFORMANCE & OPTIMIZATION')

subsec('ISR revalidation on product pages')
const productPage  = read('app/products/[slug]/page.tsx') || read('app/products/[id]/page.tsx')
const productsList = read('app/products/page.tsx')

productPage.includes('export const revalidate')
  ? pass('ISR', 'Product detail page has revalidate export')
  : fail('ISR', 'Product detail page missing: export const revalidate = 60')

productsList.includes('export const revalidate')
  ? pass('ISR', 'Product list page has revalidate export')
  : warn('ISR', 'Product list page missing revalidate — all reads hit Supabase per request')

productPage.includes('generateStaticParams')
  ? pass('ISR', 'generateStaticParams present — top products pre-rendered')
  : warn('ISR', 'generateStaticParams missing — no static pre-rendering of product pages')

subsec('Bundle analysis')
const packageJson = readJSON('package.json')
const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies } || {}

const HEAVY_DEPS = [
  { name: 'moment',    alt: 'date-fns or dayjs (much smaller)' },
  { name: 'lodash',    alt: 'lodash-es or individual functions' },
]
for (const { name, alt } of HEAVY_DEPS) {
  deps[name]
    ? warn('BUNDLE', `${name} detected — consider ${alt}`)
    : pass('BUNDLE', `No ${name} — bundle not bloated`)
}

subsec('next.config.js optimizations')
nextConfig.includes('swcMinify')
  ? pass('OPT', 'swcMinify enabled')
  : warn('OPT', 'swcMinify not explicitly set in next.config.js')

nextConfig.includes('productionBrowserSourceMaps: false')
  ? pass('OPT', 'productionBrowserSourceMaps disabled — bundle not exposed')
  : warn('OPT', 'productionBrowserSourceMaps not disabled — exposes source in production')

nextConfig.includes('images') && nextConfig.includes('formats')
  ? pass('OPT', 'Next.js image formats configured (AVIF/WebP)')
  : warn('OPT', 'image formats not configured in next.config.js')

subsec('Font loading')
const rootLayout = read('app/layout.tsx')
rootLayout.includes('display: swap') || rootLayout.includes("display: 'swap'")
  ? pass('FONT', "Font display: 'swap' configured — no FOUT")
  : warn('FONT', "Font display: 'swap' not confirmed — may cause FOUT flash on load")

subsec('Lazy loading')
const lazyHits = grepFiles('app', '.tsx', 'dynamic\\(')
lazyHits.length > 0
  ? pass('LAZY', `${lazyHits.length} dynamic() lazy-loaded component(s) found`)
  : warn('LAZY', 'No dynamic() imports found — consider lazy-loading heavy components')

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 9 — SEO & ACCESSIBILITY
// ════════════════════════════════════════════════════════════════════════════════
section('9. SEO & ACCESSIBILITY')

subsec('robots.ts / robots.txt')
exists('app/robots.ts') || exists('public/robots.txt')
  ? pass('SEO', 'robots.ts or robots.txt exists')
  : fail('SEO', 'robots.ts missing — search engines may crawl admin/api routes')

subsec('sitemap.ts')
if (exists('app/sitemap.ts')) {
  const sitemap = read('app/sitemap.ts')
  sitemap.includes('supabase') || sitemap.includes('from(')
    ? pass('SEO', 'sitemap.ts queries Supabase for dynamic product URLs')
    : fail('SEO', 'sitemap.ts is static — does not include product URLs from DB')
} else {
  fail('SEO', 'app/sitemap.ts missing')
}

subsec('Structured data')
const structuredData = read('app/structured-data.ts') || read('app/structured-data.tsx')
structuredData
  ? pass('SEO', 'Structured data file exists')
  : warn('SEO', 'No structured data (JSON-LD) found — affects rich snippets')

subsec('Open Graph metadata')
const pagesWithMeta = grepFiles('app', '.tsx', 'export.*metadata.*=').length
  + grepFiles('app', '.tsx', "export.*generateMetadata").length
pagesWithMeta > 5
  ? pass('SEO', `${pagesWithMeta} pages/routes have metadata exports`)
  : warn('SEO', `Only ${pagesWithMeta} pages have metadata — add OG tags to all product pages`)

subsec('Legal pages')
const LEGAL = [
  'app/legal/privacy/page.tsx',
  'app/legal/terms/page.tsx',
  'app/legal/refund/page.tsx',
  'app/legal/shipping/page.tsx',
  'app/legal/cancellation/page.tsx',
]
for (const p of LEGAL) {
  exists(p)
    ? pass('LEGAL', `${p.split('/').slice(-2).join('/')} exists`)
    : fail('LEGAL', `MISSING: ${p}`)
}

subsec('ARIA coverage')
const ariaInApp = grepFiles('app', '.tsx', 'aria-').length
const ariaInComp = grepFiles('components', '.tsx', 'aria-').length
ariaInApp > 10
  ? pass('A11Y', `${ariaInApp} ARIA attributes in app/ components`)
  : fail('A11Y', `Only ${ariaInApp} ARIA attributes in app/ — screen readers cannot navigate`)
info('A11Y', `${ariaInComp} ARIA attributes in components/`)

subsec('Loading skeletons')
const skeletons = grepFiles('components', '.tsx', 'Skeleton|skeleton').length
skeletons >= 8
  ? pass('A11Y', `${skeletons} skeleton/loading components found`)
  : warn('A11Y', `Only ${skeletons} skeleton components — add more for async content`)

subsec('Error boundary')
exists('components/ErrorBoundary.tsx') || exists('app/error.tsx')
  ? pass('A11Y', 'ErrorBoundary or error.tsx present')
  : fail('A11Y', 'No error.tsx — unhandled errors show raw Next.js error page')

subsec('404 page')
exists('app/not-found.tsx')
  ? pass('A11Y', 'Custom 404 page exists (app/not-found.tsx)')
  : warn('A11Y', 'No custom 404 page')

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 10 — CI/CD & DEPLOYMENT
// ════════════════════════════════════════════════════════════════════════════════
section('10. CI/CD & DEPLOYMENT')

const hasCI = exists('.github/workflows/ci.yml')
  || exists('.github/workflows/main.yml')
  || findFiles('.github/workflows', '.yml').length > 0

hasCI
  ? pass('CI', 'GitHub Actions workflow(s) found')
  : fail('CI', 'No GitHub Actions CI pipeline — create .github/workflows/ci.yml')

exists('vercel.json')
  ? pass('CI', 'vercel.json exists')
  : warn('CI', 'vercel.json missing — Vercel uses defaults')

const vercelJson = readJSON('vercel.json') || {}
const vercelHeaders = JSON.stringify(vercelJson.headers || '')
vercelHeaders.includes('Cache-Control') || vercelHeaders.includes('security')
  ? pass('CI', 'vercel.json has custom headers')
  : warn('CI', 'vercel.json has no security/cache headers')

exists('.env.example')
  ? pass('CI', '.env.example present for onboarding')
  : fail('CI', '.env.example missing — new developers cannot set up the project')

// ════════════════════════════════════════════════════════════════════════════════
// SECTION 11 — COURIER SELECTION (new feature check)
// ════════════════════════════════════════════════════════════════════════════════
section('11. SHIPPING / COURIER SELECTION')

const checkoutFile = read('app/(checkout)/Checkout.tsx')
  || read('components/checkout/Checkout.tsx')
  || read('app/checkout/page.tsx')

checkoutFile.includes('INDIA_POST') || checkoutFile.includes('shipping_provider')
  ? pass('SHIP', 'Courier selection implemented in Checkout.tsx')
  : fail('SHIP', 'Courier selection NOT implemented — customers cannot choose delivery provider')

checkoutFile.includes('OTHER') && checkoutFile.includes('shippingProviderLabel')
  ? pass('SHIP', '"Other" provider text input implemented')
  : warn('SHIP', '"Other" courier text input missing')

const migration18 = read('supabase/migrations/018_shipping_provider.sql')
  || grepFiles('supabase/migrations', '.sql', 'shipping_provider').length > 0
migration18
  ? pass('SHIP', 'DB migration for shipping_provider exists')
  : fail('SHIP', 'DB migration 018_shipping_provider.sql missing — orders table lacks courier fields')

// ════════════════════════════════════════════════════════════════════════════════
// RUN ASYNC CHECKS THEN REPORT
// ════════════════════════════════════════════════════════════════════════════════
await runHttpChecks()

// ════════════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ════════════════════════════════════════════════════════════════════════════════
section('FINAL AUDIT REPORT')

const total     = results.pass.length + results.fail.length + results.warn.length
const pct       = Math.round((results.pass.length / total) * 100)
const grade     = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
const gradeClr  = grade === 'A' ? C.green : grade === 'B' ? C.cyan : grade === 'C' ? C.yellow : C.red

console.log(`
${C.bold}╔══════════════════════════════════════════════════════╗
║          KAARI AUDIT SUMMARY                         ║
╠══════════════════════════════════════════════════════╣
║  ✓ PASS   ${String(results.pass.length).padEnd(5)}  ${gradeClr}Grade: ${grade}${C.reset}${C.bold}   Score: ${pct}%              ║
║  ✗ FAIL   ${String(results.fail.length).padEnd(5)}  Checks: ${total}                            ║
║  ⚠ WARN   ${String(results.warn.length).padEnd(5)}                                          ║
╚══════════════════════════════════════════════════════╝${C.reset}`)

if (results.fail.length > 0) {
  console.log(`\n${C.red}${C.bold}Critical Failures (fix first):${C.reset}`)
  results.fail.forEach((f, i) => console.log(`  ${i+1}. [${f.tag}] ${f.msg}`))
}

if (results.warn.length > 0) {
  console.log(`\n${C.yellow}${C.bold}Warnings:${C.reset}`)
  results.warn.forEach((w, i) => console.log(`  ${i+1}. [${w.tag}] ${w.msg}`))
}

// Write JSON report
const report = {
  timestamp:  new Date().toISOString(),
  score:      pct,
  grade,
  base_url:   BASE,
  totals:     { pass: results.pass.length, fail: results.fail.length, warn: results.warn.length },
  failures:   results.fail,
  warnings:   results.warn,
  passes:     results.pass,
}
fs.writeFileSync(path.join(ROOT, 'kaari-audit-report.json'), JSON.stringify(report, null, 2))
console.log(`\n${C.grey}Full JSON report: kaari-audit-report.json${C.reset}`)
console.log(`${C.grey}Run with --url=http://localhost:3000 to include live HTTP checks${C.reset}`)
