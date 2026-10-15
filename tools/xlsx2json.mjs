#!/usr/bin/env node
/**
 * Excel → dashboard.json
 *
 * 用法：
 *   node tools/xlsx2json.mjs --aip "<AIP表.xlsx>" [--rcid "<RCID表.xlsx>"]
 *                            [--version 2026-11] [--baseline <已有json>]
 *                            [--out <目录>] [--dry-run]
 *
 * 版本号优先取 --version，其次从文件名解析。
 * 未提供的段落沿用 --baseline（默认取 index.json 指向的最新版）的对应内容，
 * 这样单跑一份表也能产出一份完整可用的 dashboard.json。
 */
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'

import {parseAip, findAipSheet} from '../src/tools/parseAip.js'
import {parseVersionFromFilename, versionToLabel} from '../src/tools/version.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------- 参数 ---------------- */

function parseArgs(argv) {
  const out = {_: []}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[key] = true
      else {
        out[key] = next
        i++
      }
    } else out._.push(a)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const OUT_DIR = path.resolve(ROOT, args.out || 'public/data')

if (!args.aip && !args.rcid) {
  console.error(`用法：node tools/xlsx2json.mjs --aip "<AIP表.xlsx>" [--rcid "<RCID表.xlsx>"]
              [--version 2026-11] [--baseline <json>] [--out <目录>] [--dry-run]`)
  process.exit(2)
}

/* ---------------- 版本号 ---------------- */

let version = typeof args.version === 'string' ? args.version : null
if (version && !/^\d{4}-(0[1-9]|1[0-2])$/.test(version)) {
  console.error(`✗ --version 需为 YYYY-MM，收到「${version}」`)
  process.exit(2)
}

if (!version) {
  for (const f of [args.aip, args.rcid].filter(x => typeof x === 'string')) {
    const r = parseVersionFromFilename(f)
    if (r.version) {
      version = r.version
      console.log(`版本号从文件名解析：${path.basename(f)} → ${version}（匹配「${r.matched}」）`)
      break
    }
  }
}

if (!version) {
  console.error(`✗ 无法确定版本号。
  文件名里没有可识别的月份，请用 --version 指定，例如 --version 2026-11
  或与业主约定命名规范，如「RCID DART - Data Inputs 2026-11.xlsx」`)
  process.exit(2)
}

/* ---------------- 基线 ---------------- */

async function loadBaseline() {
  if (typeof args.baseline === 'string') {
    return JSON.parse(await readFile(path.resolve(args.baseline), 'utf8'))
  }
  const indexPath = path.join(OUT_DIR, 'index.json')
  if (!existsSync(indexPath)) return null
  const index = JSON.parse(await readFile(indexPath, 'utf8'))
  const id = index.default || (index.versions && index.versions[0] && index.versions[0].id)
  if (!id) return null
  // 文件名以清单的 file 为准，与前端 store.js 的 loadVersion 保持一致
  const entry = (index.versions || []).find(v => v.id === id)
  const file = (entry && entry.file) || `dashboard-${id}.json`
  const p = path.join(OUT_DIR, file)
  if (!existsSync(p)) return null
  console.log(`基线：${file}`)
  return JSON.parse(await readFile(p, 'utf8'))
}

const baseline = await loadBaseline()
if (!baseline) {
  console.error('✗ 找不到可用基线。首次生成请用 --baseline 指定一份完整的 dashboard.json')
  process.exit(2)
}

/* ---------------- 解析 ---------------- */

const doc = JSON.parse(JSON.stringify(baseline))
const warnings = []
const sourceFiles = []

doc.meta = {
  ...(doc.meta || {}),
  version,
  label: versionToLabel(version),
  generatedAt: new Date().toISOString(),
  source: []
}

if (typeof args.aip === 'string') {
  const p = path.resolve(args.aip)
  if (!existsSync(p)) {
    console.error(`✗ 找不到 AIP 表：${p}`)
    process.exit(2)
  }
  const wb = XLSX.readFile(p, {cellText: true, cellDates: true})
  const r = parseAip(findAipSheet(wb), XLSX)
  doc.aip = {...(doc.aip || {}), ...r.data}
  warnings.push(...r.warnings.map(w => `[AIP] ${w}`))
  sourceFiles.push(path.basename(p))
  console.log(`AIP   ：解析 ${r.data.list.length} 条，轮次 [${r.data.revOrder.join(', ')}]`)
}

if (typeof args.rcid === 'string') {
  const p = path.resolve(args.rcid)
  if (!existsSync(p)) {
    console.error(`✗ 找不到 RCID 表：${p}`)
    process.exit(2)
  }
  const {parseRcid} = await import('../src/tools/parseRcid.js')
  // cellNF 必开：§12 的 Percentage 列是百分比格式，要靠单元格格式才能分辨
  // 「填 38」和「填 38%」（后者存成 0.38），见 parseRcid.js 的 isPctFraction
  const wb = XLSX.readFile(p, {cellText: true, cellDates: true, cellNF: true})
  // 填报日期取报告月的月末：§16 的 Actual 曲线、§14 的「距上次事故天数」都以此为准
  const [yy, mm] = version.split('-').map(Number)
  const reportingDate = new Date(Date.UTC(yy, mm, 0))
  const r = await parseRcid(wb, XLSX, {
    baseline: doc,
    reportingDate,
    label: doc.meta.label
  })
  Object.assign(doc, r.data)
  warnings.push(...r.warnings.map(w => `[RCID] ${w}`))
  sourceFiles.push(path.basename(p))
  console.log(`RCID  ：解析 ${r.sections} 个章节，填报日按 ${reportingDate.toISOString().slice(0, 10)} 计`)
}

doc.meta.source = sourceFiles

/* ---------------- 校验 ---------------- */

if (warnings.length) {
  console.log(`\n告警 ${warnings.length} 条：`)
  warnings.forEach(w => console.log(`  ⚠ ${w}`))
  console.log()
}

/* ---------------- 写出 ---------------- */

if (args['dry-run']) {
  console.log('--dry-run：未写出文件')
  console.log(JSON.stringify(doc.meta, null, 2))
  process.exit(warnings.length ? 1 : 0)
}

await mkdir(OUT_DIR, {recursive: true})
const file = `dashboard-${version}.json`
await writeFile(path.join(OUT_DIR, file), JSON.stringify(doc, null, 2))

const indexPath = path.join(OUT_DIR, 'index.json')
const index = existsSync(indexPath)
    ? JSON.parse(await readFile(indexPath, 'utf8'))
    : {default: null, versions: []}

const prev = (index.versions || []).find(v => v.id === version)
index.versions = (index.versions || []).filter(v => v.id !== version)
index.versions.unshift({
  id: version,
  // 清单里的 label 是人为维护的，可能是「Apr 2025 · Excel」这类对照用的写法；
  // 重新导入同一版本时不该被文件里的 meta.label 冲掉，只在没有时才补默认值
  label: (prev && prev.label) || doc.meta.label,
  file,
  source: sourceFiles.join(' + '),
  generatedAt: doc.meta.generatedAt
})
// 版本按 id 倒序，最新的排前面
index.versions.sort((a, b) => String(b.id).localeCompare(String(a.id)))
index.default = version
await writeFile(indexPath, JSON.stringify(index, null, 2))

console.log(`✓ 已写出 ${path.relative(ROOT, path.join(OUT_DIR, file))}`)
console.log(`✓ 已更新 index.json，default = ${version}，共 ${index.versions.length} 个版本`)
process.exit(warnings.length ? 1 : 0)
