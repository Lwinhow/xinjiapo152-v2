/**
 * 从现有静态模块导出当前看板数据，按新 schema 组装成 dashboard.json。
 *
 * 目的：改造前先冻结一份「当前状态」快照，之后组件接 db 时视觉零回归。
 * 用法：node --import ./tools/_interop/register.mjs tools/seed-from-static.mjs
 */
import {writeFile, mkdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {zones, safetyPoints, Monitor} from '../src/utils/marker.js'
import {supportRows, qssPosts, achievements, concerns, riskRows, claimsData} from '../src/views/dashboard/data/panelData.js'
import {aipList} from '../src/utils/aipData.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public/data')
const VERSION = '2025-04'
const LABEL = 'Apr 2025'

/* ------------------------------------------------------------------
 * 以下常量当前写死在 .vue 模板里，模块导出拿不到，此处原样照抄。
 * 标注了来源行号，改造组件时应逐条删除并改为读 db。
 * ------------------------------------------------------------------ */

// LeftPanels.vue:19-46 主合同面板
const mainContract = {
  contractNo: 'DE152',
  contractor: 'CES-SDC-KTC JV',
  contractSum: 'S$757 million',
  commencement: 'May 2026',
  completion: '30 Nov 2029',
  eotGranted: '+62 days',
  projectStatus: 'CONSTRUCTION',
  projectTeam: 'PL 1 · PO 2 · Members 12',
  nearMissCum: 18,
  grading: 'GOOD',
  timeElapsedPct: 47 // LeftPanels.vue:320 仪表盘
}

// RightPanels.vue:8-52 安全面板。n 与 nCls 可由 safetyPoints 派生，deltaText 需比对上一版。
const safetyStats = [
  {cat: 'MOM ≥ 3d MC', n: 1, nCls: 'bad', delta: 'up', deltaText: '▲ 1 MoM'},
  {cat: 'Utility Damage', n: 1, nCls: 'warn', delta: 'flat', deltaText: '— MoM'},
  {cat: 'Non-MOM Incident', n: 1, nCls: '', delta: 'flat', deltaText: '— MoM'},
  {cat: 'MOM < 3d MC', n: 1, nCls: '', delta: 'flat', deltaText: '— MoM'},
  {cat: 'Env. Infringement', n: 1, nCls: '', delta: 'down', deltaText: '▼ 1 MoM'},
  {cat: 'Near Miss (Cat A)', n: 1, nCls: 'good', delta: 'up', deltaText: '▲ 2 MoM'},
  {cat: 'Vector Control', n: 1, nCls: 'warn', delta: 'down', deltaText: '▼ 1 MoM'}
]

// RightPanels.vue:219-243 造价图（对应 RCID §13.3）
const costChart = {
  months: ['Jan', 'Feb', 'Mar', 'Apr'],
  monthly: [28, 35, 46, 52],
  cumulative: [540, 575, 621, 673],
  contractSum: 1650
}

// BottomPanel.vue:35-86 总体进度（对应 RCID §16）
const overallProgress = {
  actualPct: 43,
  plannedPct: 49,
  variancePct: -6.0,
  varianceNote: '≈ 8 wks behind',
  chart: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    early: [5, 18, 38, 58, 68, 77, 84, 90, 94, 97, 99, 100],
    late: [2, 9, 20, 39, 52, 63, 72, 80, 87, 92, 96, 100],
    actual: [3, 12, 27, 43, null, null, null, null, null, null, null, null],
    planned: [3, 13, 29, 49, 60, 70, 78, 85, 91, 95, 98, 100]
  }
}

// aipData.js:523 / panelData.js:257 —— 未导出，原样照抄
const shortNames = {
  1: 'A3-1 Flyover (MC209)',
  2: 'A3-1 Flyover CADC (MC211)',
  3: 'A1-1 Depressed Roads (MC204/207)',
  4: 'A1-1 Depressed Roads (MC212/215)',
  5: 'Ped. Underpass No.10',
  6: 'A1-3 RC Culverts & Drains',
  7: 'A2-1 Temp Works Deep Exc. A4',
  8: 'A2-2 Permanent ERSS',
  9: 'A3-2 Facility Buildings',
  10: 'A6 Traffic Signages',
  11: 'Vehicular Bridges (CADC)',
  12: 'CADC Widening / Deepening'
}

const titleMap = {
  'MOM ≥ 3d MC': 'Finger injury — lever chain ratchet',
  'Utility Damage': '75mm gas pipe — trial trench damage',
  'Non-MOM Incident': 'Starhub cables damaged (3 of 10 pipes)',
  'MOM < 3d MC': 'Minor leg cut — tripped over uneven ground',
  'Env. Infringement': 'Mosquito larvae in broken WFB (Tampines North)',
  'Near Miss (Cat A)': 'GI pipe coupler not covered (laceration risk)',
  'Vector Control': 'Mosquito breeding found — Tuas Road, near LP80'
}

/* ------------------------------------------------------------------ */

const data = {
  meta: {
    version: VERSION,
    label: LABEL,
    generatedAt: new Date().toISOString(),
    source: '从既有静态模块快照（改造基线）'
  },

  mainContract,

  supportContracts: supportRows, // §2–§6
  qssPosts,                      // §2.1

  achievements: {month: LABEL, items: achievements}, // §8
  concerns,                                          // §9

  progressRisk: {riskZones: zones, topRisks: riskRows}, // §12 + marker zones

  cost: {
    claims: claimsData, // §13.1/.2/.4/.5/.7
    chart: costChart,
    wsoEotPackages: 3,  // §13.6 行数
    maxEotDays: 95      // §13.6 EOT (Days) 最大值
  },

  safety: {
    daysSinceLastMomAccident: 128, // §14.3/§14.4 最近一次事故距填报日天数
    stats: safetyStats,
    mandaysLostMonth: 36,          // §14.3+§14.4 本月
    mandaysLostCum: 214,           // §14.3+§14.4 累计
    titleMap,
    safetyPoints               // §14.1–§14.7 明细
  },

  overallProgress, // §16

  monitors: Monitor, // 无 Excel 来源，保持静态

  aip: {
    revOrder: ['Rev-', 'Rev A', 'Rev B'],
    shortNames,
    list: aipList
  }
}

const index = {
  default: VERSION,
  versions: [{
    id: VERSION,
    label: LABEL,
    file: `dashboard-${VERSION}.json`,
    source: '改造基线快照',
    generatedAt: data.meta.generatedAt
  }]
}

await mkdir(OUT_DIR, {recursive: true})
await writeFile(path.join(OUT_DIR, `dashboard-${VERSION}.json`), JSON.stringify(data, null, 2))
await writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2))

const count = o => (Array.isArray(o) ? o.length : Object.keys(o || {}).length)
console.log(`已写出 public/data/dashboard-${VERSION}.json`)
console.log(`  supportContracts ${count(data.supportContracts)}  qssPosts ${count(data.qssPosts)}`)
console.log(`  concerns ${count(data.concerns)}  achievements ${count(data.achievements.items)}`)
console.log(`  riskZones ${count(data.progressRisk.riskZones)}  topRisks ${count(data.progressRisk.topRisks)}`)
console.log(`  safetyPoints ${count(data.safety.safetyPoints)}  monitors ${count(data.monitors)}`)
console.log(`  aip.list ${count(data.aip.list)}  shortNames ${count(data.aip.shortNames)}`)
