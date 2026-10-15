/**
 * 看板数据容器 —— 全项目唯一数据源
 *
 * 本模块是叶子模块：只 import Vue，不 import 任何业务代码。
 * marker.js / panelData.js / searchIndex.js 都从它取数，反过来它会形成循环依赖。
 *
 * Vue 2 注意：必须在此处预先声明全部顶层键。运行时新增的键不具备响应性，
 * 加载器只做「整键替换」，不做 delete。
 */
import Vue from 'vue'

/**
 * 取数基址。
 * vue.config.js 里 publicPath 是 './'，process.env.BASE_URL 随之是 './'，
 * 直接拼 './data/x.json' 在 history 深路由下会解析成 /some/deep/data/x.json。
 * 本项目按域名根部署（server/index.mjs 就把 dist 挂在 /），故这里归一化成绝对路径。
 * 若将来改部署到子路径，需把 publicPath 设成该子路径的绝对形式。
 */
const DATA_BASE = (process.env.BASE_URL || '/').replace(/^\.\//, '/')

/** 可被数据覆盖的顶层段落 */
const SECTIONS = [
  'meta', 'mainContract', 'supportContracts', 'qssPosts',
  'achievements', 'concerns', 'progressRisk', 'cost',
  'safety', 'overallProgress', 'monitors', 'aip'
]

export const db = Vue.observable({
  // 加载状态
  ready: false,
  loading: false,
  error: null,
  version: null,
  versions: [],

  // 就绪门闩（供 3D 标记使用，见 utils/marker.js）
  dataReady: false,
  engineReady: false,

  // 展示角标：当前数据来自本机预览而非服务端
  isPreview: false,

  // ---- 以下为数据段落，形状即 dashboard.json 的 schema ----
  meta: {},

  mainContract: {
    contractNo: '', contractor: '', contractSum: '', commencement: '', completion: '',
    eotGranted: '', projectStatus: '', projectTeam: '', nearMissCum: 0,
    grading: '', timeElapsedPct: 0
  },

  supportContracts: [],
  qssPosts: [],

  achievements: {month: '', items: []},
  concerns: [],

  progressRisk: {riskZones: [], topRisks: []},

  cost: {
    claims: {count: [], amt: []},
    chart: {months: [], monthly: [], cumulative: [], contractSum: 0},
    wsoEotPackages: 0,
    maxEotDays: 0
  },

  safety: {
    daysSinceLastMomAccident: 0,
    stats: [],
    mandaysLostMonth: 0,
    mandaysLostCum: 0,
    titleMap: {},
    safetyPoints: []
  },

  overallProgress: {
    actualPct: 0, plannedPct: 0, variancePct: 0, varianceNote: '',
    chart: {months: [], early: [], late: [], actual: [], planned: []}
  },

  monitors: [],

  aip: {revOrder: ['Rev-', 'Rev A', 'Rev B'], shortNames: {}, list: []}
})

/** 把一份 dashboard 数据整体灌入容器，缺段保留默认值 */
export function apply(data) {
  SECTIONS.forEach(key => {
    if (data[key] !== undefined) db[key] = data[key]
  })
  db.version = (data.meta && data.meta.version) || db.version
  db.ready = true
  db.dataReady = true
}

/**
 * 导出纯数据段（不含 ready/loading 这些运行时状态），
 * 供上传解析时当基线用 —— 未在 Excel 中出现的段落保持不动。
 */
export function rawDoc() {
  const out = {}
  SECTIONS.forEach(k => { out[k] = JSON.parse(JSON.stringify(db[k])) })
  return out
}

async function getJson(file) {
  const res = await fetch(`${DATA_BASE}data/${file}`, {cache: 'no-cache'})
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${file}`)
  return res.json()
}

/** 读取版本清单，返回 index.json 内容 */
export async function loadIndex() {
  const index = await getJson('index.json')
  db.versions = index.versions || []
  return index
}

/**
 * 页面默认展示哪一版。
 *
 * 优先用清单的 default —— 上传接口存完就会把它指向刚写的那版，
 * 所以「打开页面就是最新导入的数据」靠的是这一条。
 * default 缺失或指向已不存在的条目时（手改清单、删过文件），
 * 退回 generatedAt 最新的一版，再不行按 id 比，避免整页空着。
 */
function pickLatest(index) {
  const list = (index.versions || []).slice()
  if (index.default && list.some(v => v.id === index.default)) return index.default
  if (!list.length) return null
  list.sort((a, b) =>
      String(b.generatedAt || '').localeCompare(String(a.generatedAt || '')) ||
      String(b.id).localeCompare(String(a.id)))
  return list[0].id
}

/** 本机预览态（由上传弹窗写入），只影响当前浏览器 */
const PREVIEW_KEY = 'de152:preview'

function readPreview() {
  try {
    const s = localStorage.getItem(PREVIEW_KEY)
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}

/** 加载指定版本；不传则用清单里的 default。存在本机预览时优先用预览。 */
export async function loadVersion(id) {
  db.loading = true
  db.error = null
  try {
    const preview = readPreview()
    if (preview) {
      db.isPreview = true
      apply(preview)
      // 版本清单仍需拉取，供报告月与版本切换使用
      try {
        await loadIndex()
      } catch (e) {
        /* 预览态下清单拉取失败不阻塞渲染 */
      }
      return preview
    }

    let target = id
    if (!target) {
      const index = await loadIndex()
      target = pickLatest(index)
    }
    if (!target) throw new Error('index.json 里没有任何可用版本')

    // 文件名以清单的 file 为准，缺省才回落到 dashboard-<id>.json。
    // 版本 id 不必等于月份，清单里可以挂任意命名的文件（如留档的历史版本）。
    let entry = db.versions.find(v => v.id === target)
    if (!entry) {
      const index = await loadIndex()
      entry = (index.versions || []).find(v => v.id === target)
    }
    const data = await getJson((entry && entry.file) || `dashboard-${target}.json`)
    db.isPreview = false
    apply(data)
    // 身份以清单为准：文件里的 meta.version 只是副本，可能与 id 不一致
    db.version = target
    return data
  } catch (e) {
    db.error = e.message
    db.loading = false
    throw e
  } finally {
    db.loading = false
  }
}

/** 供 Batch 7 的预览功能使用：把本机解析结果直接灌入，不走网络 */
export function applyPreview(data) {
  db.isPreview = true
  apply(data)
}
