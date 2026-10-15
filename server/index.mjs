/**
 * DE152 看板 —— 版本数据服务（零依赖）
 *
 *   静态资源  →  ./dist
 *   版本数据  →  ./public/data  （dev 由 vue-cli serve 提供，prod 由本服务路由 /data/）
 *
 * 启动：
 *   node server/index.mjs
 *
 * 写入：
 *   POST /api/versions   {version:"2026-11", label:"...", source:"...", data:{...}}
 *
 * ⚠ 写入接口不鉴权。这是现场运维用的内部入口（前端也要 ?import=1 才露出按钮），
 *   前提是本服务只在内部网络可达。若要暴露到更大范围，必须在反向代理层加访问控制 ——
 *   或者在这里重新加回一个口令校验，别只靠端口不被发现。
 */
import {createServer} from 'node:http'
import {readFile, writeFile, rename, mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

/*
 * 与 src/utils/config.js 保持一致（server 由 node 直接运行，不走 webpack，
 * 无法使用 @ 别名，也不适合 import 前端的 .js ESM 文件，故在此内联）。
 * 直接 node 启动时 NODE_ENV 未设置，回退 development。
 */
const BASE_URLS = {
  development: 'http://172.168.34.19:3000',
  test: 'http://122.11.233.165:3000',
  production: 'http://122.11.233.165:3000',
}
const BASE_URL = BASE_URLS[process.env.NODE_ENV] || BASE_URLS.development

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

/*
 * 版本数据统一放 public/data —— dev/prod 共用一条路径：
 *   dev : npm run serve 只从 public/ 取静态文件，写别处前端读不到
 *   prod: 本服务把 /data/ 路由指到这里，与 dist 解耦
 * build 只清 dist/ 不动 public/，上传的版本数据不会被 build 清掉。
 * 注意：build 会把 public/data 快照进 dist/data（用本服务时 /data/ 路由先拦截，无影响；
 * 纯静态部署 dist 时会带上一份过期快照）。
 * 可用 DATA_DIR 覆盖（如 DATA_DIR=data 用回旧目录）。
 */
const DATA = path.resolve(ROOT, process.env.DATA_DIR || 'public/data')
const INDEX = path.join(DATA, 'index.json')

const PORT = Number(process.env.PORT || 3000)
const MAX_BODY = 5 << 20

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

const json = (res, code, obj) => {
  const body = JSON.stringify(obj)
  res.writeHead(code, {'content-type': 'application/json; charset=utf-8'})
  res.end(body)
}

/** 读请求体，超限直接断开 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** 只允许 YYYY-MM，返回拼好的绝对路径 —— 杜绝路径穿越 */
function versionFile(version) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(version)) return null
  const name = `dashboard-${version}.json`
  return {name, full: path.join(DATA, name)}
}

async function readIndex() {
  try {
    return JSON.parse(await readFile(INDEX, 'utf8'))
  } catch {
    return {default: null, versions: []}
  }
}

async function handleUpload(req, res) {
  let payload
  try {
    payload = JSON.parse((await readBody(req)).toString('utf8'))
  } catch (e) {
    return json(res, 400, {error: '请求体不是合法 JSON：' + e.message})
  }

  const {version, data, label, source} = payload || {}
  const target = versionFile(String(version || ''))
  if (!target) return json(res, 400, {error: 'version 须为 YYYY-MM'})
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json(res, 400, {error: 'data 须为对象'})
  }

  await mkdir(DATA, {recursive: true})

  // 先写临时文件再 rename —— 大屏读取过程中不会看到半截文件
  const tmp = path.join(DATA, `.${target.name}.${process.pid}.tmp`)
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await rename(tmp, target.full)

  const idx = await readIndex()
  idx.versions = (idx.versions || []).filter(v => v.id !== version)
  idx.versions.unshift({
    id: version,
    label: label || version,
    file: target.name,
    source: source || '',
    generatedAt: new Date().toISOString()
  })
  idx.default = version
  await writeFile(INDEX, JSON.stringify(idx, null, 2), 'utf8')

  json(res, 200, {ok: true, id: version, file: target.name, versions: idx.versions.length})
}

/**
 * @param {boolean} immutable dist 的 js/css 文件名带内容 hash，可长缓存；
 *   data/ 下的版本文件名是固定的（dashboard-2025-04.json），内容却会被重导覆盖，
 *   必须每次回源校验 —— 否则同一个版本号重新导入后，浏览器一年内都吃旧副本。
 */
async function serveStatic(res, base, relPath, immutable) {
  // 归一化后必须仍在 base 内
  const full = path.resolve(base, '.' + path.posix.normalize('/' + relPath))
  if (!full.startsWith(base + path.sep) && full !== base) {
    res.writeHead(403).end('Forbidden')
    return
  }
  let file = full
  try {
    const {stat} = await import('node:fs/promises')
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
  } catch {
    if (path.extname(relPath)) {
      res.writeHead(404).end('Not Found')
      return
    }
    file = path.join(base, 'index.html')   // history 模式回退
  }
  try {
    const buf = await readFile(file)
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': immutable && !file.endsWith('.html')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache'
    })
    res.end(buf)
  } catch {
    res.writeHead(404).end('Not Found')
  }
}

const server = createServer(async (req, res) => {
  const {pathname} = new URL(req.url, BASE_URL)

  if (pathname === '/api/versions' && req.method === 'POST') {
    try {
      return await handleUpload(req, res)
    } catch (e) {
      return json(res, 500, {error: e.message})
    }
  }

  if (pathname === '/api/versions' && req.method === 'GET') {
    return json(res, 200, await readIndex())
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, {error: 'Method Not Allowed'})
  }

  // 版本数据独立于 dist，重新 build 不会丢
  if (pathname.startsWith('/data/')) {
    return serveStatic(res, DATA, pathname.slice('/data'.length), false)
  }
  if (!existsSync(DIST)) {
    res.writeHead(500).end('dist 不存在，先执行 npm run build')
    return
  }
  return serveStatic(res, DIST, pathname, true)
})

server.listen(PORT, () => {
  console.log(`listening on ${BASE_URL}`)
})
