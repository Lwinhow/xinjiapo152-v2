/**
 * AIP 解析器端到端校验
 *
 * 用唯一含真实数据的 AIP 表跑一遍解析，与改造前冻结的基线
 * （public/data/dashboard-2025-04.json 的 aip.list）逐字段比对。
 * 这是本项目唯一能证伪解析逻辑的机会 —— RCID 是空白模板。
 *
 * 比对方针：结构与取值总数严格比对；文本类差异做归一化后再比 ——
 *   - 日期：解析器统一输出 ISO，基线混用 d-mmm-yy / yyyy/m/d，按日期语义比
 *   - 空白：解析器会 trim，基线保留了手工输入的空格
 * 归一化后仍不一致的，即为真正的问题。
 *
 * 用法：node tools/verify-aip.mjs [xlsx路径]
 */
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {parseAip, findAipSheet} from '../src/tools/parseAip.js'
import {buildAipStats, buildAipRows, buildAipRevs} from '../src/utils/aipData.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const XLSX_PATH = process.argv[2] ||
    '/Users/jiangyou/work/TYLin/新加坡-数据导入/DE152 AIP tracking list.xlsx'
const BASELINE = path.join(ROOT, 'tools/fixtures/baseline-dashboard.json')

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** 把各种日期写法折成 yyyy-m-d，非日期返回 null */
function asDateKey(s) {
  if (typeof s !== 'string') return null
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) return `${m[3]}-${mi + 1}-${+m[1]}`
  }
  m = s.match(/^(\d{1,2})[/-]([A-Za-z]+)[/-](\d{2,4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) {
      let y = +m[3]
      if (y < 100) y += 2000
      return `${y}-${mi + 1}-${+m[1]}`
    }
  }
  m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (m) return `${+m[1]}-${+m[2]}-${+m[3]}`
  return null
}

/** 归一化：日期比语义，文本去空白，空数组与空串等价 */
function canon(v) {
  if (Array.isArray(v) && v.length === 0) return ''
  if (typeof v === 'string') {
    const d = asDateKey(v)
    if (d) return `@date:${d}`
    return v.trim()
  }
  return v
}

function diff(a, b, p = '', out = []) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${p}: 数组长度 ${a.length} vs ${b.length}`)
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff(a[i], b[i], `${p}[${i}]`, out)
    return out
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    if (keys.includes('') || keys.some(k => k.trim() === '')) {
      out.push(`${p}: 出现空键 ${JSON.stringify(keys)}`)
    }
    for (const k of keys) diff(a[k], b[k], p ? `${p}.${k}` : k, out)
    return out
  }
  const ca = canon(a)
  const cb = canon(b)
  if (ca !== cb) out.push(`${p}: 解析 ${JSON.stringify(a)} vs 基线 ${JSON.stringify(b)}`)
  return out
}

const wb = XLSX.readFile(XLSX_PATH, {cellText: true, cellDates: true})
const sheet = findAipSheet(wb)
const {data, warnings} = parseAip(sheet, XLSX)

const baselineDoc = JSON.parse(await readFile(BASELINE, 'utf8'))
const baseline = baselineDoc.aip
const baseShortNames = baseline.shortNames || {}

console.log(`源文件    : ${path.basename(XLSX_PATH)}`)
console.log(`解析结果  : ${data.list.length} 条 AIP，轮次 [${data.revOrder.join(', ')}]`)
console.log(`基线数据  : ${baseline.list.length} 条 AIP，轮次 [${Object.keys(baseline.list[0].revs).join(', ')}]`)
console.log(`解析告警  : ${warnings.length}${warnings.length ? '' : ' ✓'}`)
warnings.forEach(w => console.log(`  ⚠ ${w}`))
console.log()

/*
 * 已接受的差异。
 *
 * 基线是改造前那版硬编码 mock 的快照，而它是人工敲进去的，敲错的地方在这里
 * 会被当成「差异」。裁决标准是 Excel 原文：解析结果与单元格一致，就是基线错。
 * 每一条都要写清依据 —— 否则这个白名单会慢慢变成「让测试变绿」的后门。
 */
const ACCEPTED = [
  {
    path: 'list[6].submissionRef[4]',
    why: '基线手敲作 "(part 3/3)?(Email)"，Excel D11 原文是 "(part 3/3) (Email)"（空格分隔），解析结果与 Excel 一致'
  }
]
const acceptedPaths = new Set(ACCEPTED.map(a => a.path))
const pathOf = d => d.slice(0, d.indexOf(': '))

const diffs = diff({list: data.list}, {list: baseline.list})
const unexpected = diffs.filter(d => !acceptedPaths.has(pathOf(d)))
const hitAccepted = diffs.filter(d => acceptedPaths.has(pathOf(d)))

// 直接跑生产函数，确认面板展示值与改造前一致
const parsedRevs = buildAipRevs(data.list, data.revOrder)
const baseRevs = buildAipRevs(baseline.list, baseline.revOrder)
console.log('Rev 进度条（buildAipRevs）:')
parsedRevs.forEach((r, i) => {
  const same = baseRevs[i] && baseRevs[i].n === r.n
  console.log(`  ${r.name.padEnd(6)} ${String(r.n).padStart(3)}   ${same ? '= 基线' : '≠ 基线 ' + baseRevs[i].n}`)
})
console.log()

console.log('AIP 统计卡（buildAipStats）:')
const pStats = buildAipStats(data.list)
const bStats = buildAipStats(baseline.list)
pStats.forEach((s, i) => {
  const same = bStats[i] && bStats[i].n === s.n
  console.log(`  ${s.label.padEnd(11)} ${String(s.n).padStart(3)}   ${same ? '= 基线' : '≠ 基线 ' + bStats[i].n}`)
})
console.log()

const pRows = buildAipRows(data.list, baseShortNames)
const bRows = buildAipRows(baseline.list, baseShortNames)
const rowDiffs = diff(pRows, bRows, 'aipRows')
console.log(`AIP 表格行（buildAipRows）: ${rowDiffs.length ? rowDiffs.length + ' 处差异' : '与基线一致 ✓'}`)
rowDiffs.slice(0, 10).forEach(d => console.log('  ' + d))
console.log()

if (hitAccepted.length) {
  console.log(`已接受差异 ${hitAccepted.length} 处（Excel 为准，基线手敲有误）:`)
  ACCEPTED.forEach(a => console.log(`  · ${a.path}\n      ${a.why}`))
  console.log()
}

if (!unexpected.length) {
  console.log('✅ 归一化后与基线一致（含已接受差异）')
  process.exit(0)
}

console.log(`❌ 归一化后仍有 ${unexpected.length} 处未预期的差异`)
unexpected.slice(0, 30).forEach(d => console.log('  ' + d))
if (unexpected.length > 30) console.log(`  ... 另有 ${unexpected.length - 30} 处`)
process.exit(1)
