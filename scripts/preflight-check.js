#!/usr/bin/env node
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
}

const step = (n, total) => `${COLORS.dim}[${n}/${total}]${COLORS.reset}`
const pass = (msg) => `${COLORS.green}✓${COLORS.reset} ${msg}`
const fail = (msg) => `${COLORS.red}✗${COLORS.reset} ${msg}`
const warn = (msg) => `${COLORS.yellow}!${COLORS.reset} ${msg}`
const info = (msg) => `${COLORS.cyan}ℹ${COLORS.reset} ${msg}`
const title = (msg) => `\n${COLORS.bold}${COLORS.cyan}▶ ${msg}${COLORS.reset}\n`

let errors = 0
let warnings = 0
let buildOk = false
const TOTAL_STEPS = 4

function banner() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}`)
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║        🚀  交付前自动检查 (Preflight)        ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`${COLORS.reset}`)
}

function summary() {
  console.log(`\n${COLORS.bold}═══════════════════════════════════════════════${COLORS.reset}`)
  if (errors === 0) {
    console.log(pass(`全部检查通过！可以安全交付。`))
    if (warnings > 0) {
      console.log(warn(`有 ${warnings} 条警告，建议确认但不阻塞交付。`))
    }
    console.log()
    process.exit(0)
  } else {
    console.log(fail(`发现 ${errors} 处错误，请修复后再交付。`))
    if (warnings > 0) {
      console.log(warn(`另有 ${warnings} 条警告。`))
    }
    console.log()
    process.exit(1)
  }
}

async function checkDependencies() {
  console.log(title(`${step(1, TOTAL_STEPS)} 依赖完整性检查`))

  const pkgPath = join(ROOT, 'package.json')
  if (!existsSync(pkgPath)) {
    console.log(fail('package.json 不存在'))
    errors++
    return
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  const depNames = Object.keys(allDeps)

  if (depNames.length === 0) {
    console.log(warn('package.json 中没有声明任何依赖'))
    warnings++
    return
  }

  const nmPath = join(ROOT, 'node_modules')
  if (!existsSync(nmPath)) {
    console.log(fail('node_modules 不存在，请先执行 npm install'))
    errors++
    return
  }

  let missing = []
  for (const name of depNames) {
    if (!existsSync(join(nmPath, name))) {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    console.log(fail(`缺失 ${missing.length} 个依赖：${missing.join(', ')}`))
    console.log(info('请执行：npm install'))
    errors++
  } else {
    console.log(pass(`所有 ${depNames.length} 个依赖均已安装`))
  }

  const lockPath = join(ROOT, 'package-lock.json')
  if (!existsSync(lockPath)) {
    console.log(warn('缺少 package-lock.json，建议提交锁定文件以保证构建一致性'))
    warnings++
  } else {
    console.log(pass('package-lock.json 存在'))
  }
}

async function checkBuild() {
  console.log(title(`${step(2, TOTAL_STEPS)} 生产构建检查`))

  const distPath = join(ROOT, 'dist')
  if (existsSync(distPath)) {
    try { require('node:fs').rmSync(distPath, { recursive: true, force: true }) } catch {}
  }

  console.log(info('执行 vite build ...'))
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  })

  const stdout = result.stdout?.toString() || ''
  const stderr = result.stderr?.toString() || ''

  if (result.status !== 0) {
    console.log(fail('构建失败！'))
    if (stderr) console.log(`\n${COLORS.dim}${stderr}${COLORS.reset}\n`)
    errors++
    return
  }

  if (stderr && stderr.toLowerCase().includes('error')) {
    console.log(warn('构建过程中出现疑似错误信息，请核对构建日志'))
    warnings++
  }

  console.log(pass('vite build 执行成功'))
  buildOk = true

  if (stdout) {
    const match = stdout.match(/dist\/index\.html/g)
    if (match) {
      console.log(pass('构建包含 index.html 入口'))
    }
  }
}

async function checkArtifacts() {
  console.log(title(`${step(3, TOTAL_STEPS)} 构建产物检查`))

  if (!buildOk) {
    console.log(warn('构建未成功，跳过产物检查。请先修复构建问题。'))
    warnings++
    return
  }

  const distPath = join(ROOT, 'dist')
  if (!existsSync(distPath)) {
    console.log(fail('dist 目录不存在，构建可能未成功'))
    errors++
    return
  }

  const required = [
    { file: 'index.html', desc: 'HTML 入口' },
    { file: 'assets', desc: '静态资源目录', isDir: true }
  ]

  for (const item of required) {
    const full = join(distPath, item.file)
    if (!existsSync(full)) {
      console.log(fail(`缺少 ${item.desc}：${item.file}`))
      errors++
      continue
    }
    const st = statSync(full)
    if (item.isDir && !st.isDirectory()) {
      console.log(fail(`${item.file} 应为目录`))
      errors++
    } else if (!item.isDir && !st.isFile()) {
      console.log(fail(`${item.file} 应为文件`))
      errors++
    } else {
      console.log(pass(`${item.desc} 存在：${item.file}${item.isDir ? '/' : ''}`))
    }
  }

  const assetsDir = join(distPath, 'assets')
  if (existsSync(assetsDir)) {
    const assets = readdirSync(assetsDir)
    const hasJS = assets.some(f => f.endsWith('.js'))
    const hasCSS = assets.some(f => f.endsWith('.css'))

    if (hasJS) console.log(pass(`包含 JS 资源（${assets.filter(f => f.endsWith('.js')).length} 个文件）`))
    else { console.log(fail('未找到 JS 资源文件')); errors++ }

    if (hasCSS) console.log(pass(`包含 CSS 资源（${assets.filter(f => f.endsWith('.css')).length} 个文件）`))
    else { console.log(warn('未找到 CSS 资源文件（如果项目无样式可忽略）')); warnings++ }

    const indexHtml = readFileSync(join(distPath, 'index.html'), 'utf-8')
    for (const f of assets) {
      if (f.endsWith('.js') || f.endsWith('.css')) {
        if (!indexHtml.includes(f)) {
          console.log(warn(`资源 ${f} 未在 index.html 中被引用`))
          warnings++
        }
      }
    }
  }

  const indexHtml = readFileSync(join(distPath, 'index.html'), 'utf-8')
  if (indexHtml.includes('<div id="app"></div>') || indexHtml.includes('<div id="app">')) {
    console.log(pass('index.html 包含 Vue 挂载点 #app'))
  } else {
    console.log(fail('index.html 缺少 Vue 挂载点 #app'))
    errors++
  }

  const totalSize = dirSize(distPath)
  console.log(info(`构建产物总大小：${formatSize(totalSize)}`))
}

function dirSize(p) {
  let total = 0
  const items = readdirSync(p, { withFileTypes: true })
  for (const it of items) {
    const fp = join(p, it.name)
    if (it.isDirectory()) total += dirSize(fp)
    else total += statSync(fp).size
  }
  return total
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

async function checkPageEntries() {
  console.log(title(`${step(4, TOTAL_STEPS)} 页面入口检查`))

  const routerPath = join(ROOT, 'src', 'router', 'index.js')
  if (!existsSync(routerPath)) {
    console.log(fail('路由配置文件不存在：src/router/index.js'))
    errors++
    return
  }

  const routerSrc = readFileSync(routerPath, 'utf-8')
  const importMatches = [
    ...routerSrc.matchAll(/import\s+\w+\s+from\s+['"](@\/views\/[^'"]+)['"]/g)
  ]
  const pathMatches = [
    ...routerSrc.matchAll(/path:\s*['"]([^'"]+)['"]/g)
  ]
  const nameMatches = [
    ...routerSrc.matchAll(/name:\s*['"]([^'"]+)['"]/g)
  ]

  const routes = []
  for (let i = 0; i < importMatches.length; i++) {
    const viewPath = importMatches[i][1]
    routes.push({
      view: viewPath,
      path: pathMatches[i] ? pathMatches[i][1] : '(未配置)',
      name: nameMatches[i] ? nameMatches[i][1] : '(未命名)'
    })
  }

  if (routes.length === 0) {
    console.log(fail('未在路由文件中解析到任何页面配置'))
    errors++
    return
  }

  console.log(info(`解析到 ${routes.length} 个路由页面：`))

  for (const r of routes) {
    const fsPath = r.view.replace('@/', join(ROOT, 'src') + '/')
    const line = `  ${COLORS.dim}[${r.name}]${COLORS.reset} ${r.path} → ${r.view}`

    if (!existsSync(fsPath)) {
      console.log(fail(line + ' → 文件不存在！'))
      errors++
      continue
    }

    try {
      const content = readFileSync(fsPath, 'utf-8')
      const hasTemplate = content.includes('<template')
      const hasScript = content.includes('<script')
      if (!hasTemplate && !hasScript) {
        console.log(warn(line + ' → 缺少 template 或 script 标签'))
        warnings++
      } else {
        console.log(pass(line))
      }
    } catch (e) {
      console.log(fail(line + ` → 读取失败：${e.message}`))
      errors++
    }
  }

  const mainJsPath = join(ROOT, 'src', 'main.js')
  if (existsSync(mainJsPath)) {
    const mainSrc = readFileSync(mainJsPath, 'utf-8')
    const hasRouter = mainSrc.includes('app.use(router)') || mainSrc.includes('.use(router)')
    const hasMount = mainSrc.includes('.mount(')
    if (hasRouter) console.log(pass('main.js 中已注册路由插件'))
    else { console.log(fail('main.js 中未注册路由插件 (.use(router))')); errors++ }
    if (hasMount) console.log(pass('main.js 中已调用 app.mount()'))
    else { console.log(fail('main.js 中未调用 app.mount()')); errors++ }
  }

  const appVuePath = join(ROOT, 'src', 'App.vue')
  if (existsSync(appVuePath)) {
    const appSrc = readFileSync(appVuePath, 'utf-8')
    const hasRouterView = appSrc.includes('<router-view')
    if (hasRouterView) console.log(pass('App.vue 中包含 <router-view> 路由出口'))
    else { console.log(fail('App.vue 中缺少 <router-view> 路由出口')); errors++ }
  }
}

async function main() {
  banner()
  await checkDependencies()
  await checkBuild()
  await checkArtifacts()
  await checkPageEntries()
  summary()
}

main().catch(e => {
  console.error(fail('检查脚本运行出错：'), e)
  process.exit(2)
})
