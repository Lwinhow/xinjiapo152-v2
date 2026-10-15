/**
 * 全局检索索引（仅文本）
 *
 * action 字段含义：
 *   tab         - 需要先切换的 tab（overview / safety / monitor）
 *   dialog      - 需要打开的弹窗类型（safetyDetail / rowDetail / qssDetail / monitor）
 *   payload     - 弹窗数据（对象引用与 db 同源）
 *   panel       - 需要闪烁的面板 id（如 pRisk）
 *   el          - 更细粒度闪烁目标（CSS 选择器，优先于 panel）
 *   monthTab    - Monthly Review 需要激活的子 tab（achv / conc）
 *   contractTab - CONTRACT 面板需要激活的子 tab（main / support）
 *
 * 索引必须在数据到达后才能构建，故改为可重建结构：
 *   数据加载完成 → rebuildIndex()；检索前 ensureIndex() 兜底。
 */
import {db} from '@/data/store'
import {buildSafetyRecords, buildRiskRecords} from '@/views/dashboard/data/panelData'

let index = []
let builtVersion = null
let builtPreview = null

function kw(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function add(list, id, category, title, keywords, action) {
  list.push({id, category, title, keywords, action})
}

/** 纯 UI 文案，不随填报数据变化 */
const PANEL_ENTRIES = [
  {id: 'p:title:contract', cat: 'Panel', t: 'MAIN CONTRACT', k: 'main contract', panel: 'pContract', el: 'p:title:contract', contractTab: 'main'},
  {id: 'p:title:support', cat: 'Panel', t: 'SUPPORTING CONTRACTS', k: 'supporting contracts', panel: 'pContract', el: 'p:title:support', contractTab: 'support'},
  {id: 'p:title:safety', cat: 'Panel', t: 'SAFETY & ENVIRONMENT', k: 'safety environment §14', panel: 'pSafety', el: 'p:title:safety'},
  {id: 'p:title:risk', cat: 'Panel', t: 'PROGRESS RISK', k: 'progress risk delay', panel: 'pRisk', el: 'p:title:risk'},
  {id: 'p:title:cost', cat: 'Panel', t: 'COST & CLAIMS', k: 'cost claims §13', panel: 'pCost', el: 'p:title:cost'},
  {id: 'p:title:progress', cat: 'Panel', t: 'OVERALL PROGRESS', k: 'overall progress §16', panel: 'pProgress', el: 'p:title:progress'},
  {id: 'p:title:month', cat: 'Panel', t: 'MONTHLY REVIEW', k: 'monthly review', panel: 'pMonth', el: 'p:title:month'},
  {id: 'c:legend', cat: 'Cost & Claims', t: 'Submitted / Under Review / Approved·Closed', k: 'submitted under review approved closed', panel: 'pCost', el: 'c:legend'},
  {id: 'm:achvTab', cat: 'Monthly Review', t: 'ACHIEVEMENTS (§8)', k: 'achievements §8', panel: 'pMonth', monthTab: 'achv'},
  {id: 'm:concTab', cat: 'Monthly Review', t: 'CONCERNS (§9)', k: 'concerns §9', panel: 'pMonth', monthTab: 'conc'},
  {id: 'p:ap', cat: 'Overall Progress', t: 'ACTUAL / PLANNED', k: 'actual planned', panel: 'pProgress', el: 'p:info'}
]

/** 主合同 kv：标签 + 取值字段 + 保留的原有检索词 */
const MC_FIELDS = [
  {id: 'mc:no', label: 'Contract No.', field: 'contractNo', el: 'mc:contractNo', k: 'contract no.'},
  {id: 'mc:contractor', label: 'Contractor', field: 'contractor', el: 'mc:contractor', k: 'contractor'},
  {id: 'mc:sum', label: 'Contract Sum', field: 'contractSum', el: 'mc:contractSum', k: 'contract sum'},
  {id: 'mc:start', label: 'Commencement', field: 'commencement', el: 'mc:commencement', k: 'commencement'},
  {id: 'mc:done', label: 'Completion', field: 'completion', el: 'mc:completion', k: 'completion'},
  {id: 'mc:eot', label: 'EOT Granted', field: 'eotGranted', el: 'mc:eot', k: 'eot granted extension of time'},
  {id: 'mc:status', label: 'Project Status', field: 'projectStatus', el: 'mc:status', k: 'project status'},
  {id: 'mc:team', label: 'Project Team', field: 'projectTeam', el: 'mc:team', k: 'project team'},
  {id: 'mc:nm', label: 'Near Miss Reported (cum.)', field: 'nearMissCum', el: 'mc:nearMiss', k: 'near miss reported cum'}
]

/** 构建索引。数据变化后需重新调用。 */
export function rebuildIndex() {
  const next = []
  const zones = db.progressRisk.riskZones || []
  const safetyPoints = db.safety.safetyPoints || []
  const monitors = db.monitors || []
  const safetyRecords = buildSafetyRecords(safetyPoints, db.safety.titleMap || {})
  const riskRecords = buildRiskRecords(zones)

  /* ---------- 地图 zones → 风险详情弹窗 ---------- */
  zones.forEach(z => {
    const rec = (riskRecords[z.risk] || []).find(r => r.title === z.name)
    add(next,
        `zone:${z.name}`,
        'Progress Risk',
        `Zone: ${z.name}`,
        kw(z.name, z.el, z.risk, z.reason, z.remark, 'zone'),
        {tab: 'overview', dialog: 'safetyDetail', payload: rec, panel: 'pRisk'}
    )
  })

  /* ---------- safetyPoints → 安全详情弹窗（含 desc） ---------- */
  safetyPoints.forEach(sp => {
    const rec = (safetyRecords[sp.cat] || [])[0]
    const fieldText = Object.keys(sp)
        .filter(k => !['co', 'cat', 'desc'].includes(k))
        .map(k => sp[k])
        .join(' ')
    add(next,
        `safety:${sp.cat}`,
        'Safety',
        `Safety: ${sp.cat}`,
        kw(sp.cat, sp.desc, fieldText),
        {tab: 'safety', dialog: 'safetyDetail', payload: rec, panel: 'pSafety'}
    )
  })

  /* ---------- Monitor → 监控弹窗 ---------- */
  monitors.forEach(m => {
    add(next,
        `monitor:${m.id}`,
        'Monitor',
        m.name,
        kw(m.name, m.area, m.deviceStatus, m.anomalyDetected ? 'anomaly yes' : 'anomaly no', 'monitor'),
        {tab: 'monitor', dialog: 'monitor', payload: m}
    )
  })

  /* ---------- Supporting Contracts 行 → 行详情弹窗 ---------- */
  ;(db.supportContracts || []).forEach(row => {
    const ownText = Object.keys(row)
        .filter(k => k !== 'fields')
        .map(k => row[k])
        .filter(v => typeof v !== 'object')
        .join(' ')
    const fieldNames = (row.fields || []).map(f => f.k).join(' ')
    add(next,
        `support:${row.role}`,
        'Supporting Contract',
        `Supporting Contract: ${row.role}`,
        kw(row.role, ownText, fieldNames, 'supporting contract'),
        {dialog: 'rowDetail', payload: row, panel: 'pContract', contractTab: 'support'}
    )
  })

  /* ---------- QSS Posts → QSS 详情弹窗 ---------- */
  ;(db.qssPosts || []).forEach(q => {
    add(next,
        `qss:${q.post}`,
        'QSS Post',
        `QSS: ${q.post} — ${q.name}`,
        kw(q.post, q.name, q.designation, q.regNo, q.rating, q.remarks, 'qss'),
        {dialog: 'qssDetail', payload: q, panel: 'pContract', contractTab: 'support'}
    )
  })

  /* ---------- Monthly Review ---------- */
  ;((db.achievements && db.achievements.items) || []).forEach((t, i) => {
    add(next,
        `achv:${i}`,
        'Monthly Review',
        `Achievement: ${t}`,
        kw(t, 'achievement', 'achievements'),
        {panel: 'pMonth', monthTab: 'achv', el: `[data-search-id="achv:${i}"]`}
    )
  })
  ;(db.concerns || []).forEach((c, i) => {
    add(next,
        `concern:${i}`,
        'Monthly Review',
        `Concern: ${c.t}`,
        kw(c.t, c.m, c.lv, 'concern', 'concerns'),
        {panel: 'pMonth', monthTab: 'conc', el: `[data-search-id="concern:${i}"]`}
    )
  })

  /* ---------- Progress Risk 表格行 ---------- */
  ;(db.progressRisk.topRisks || []).forEach((r, i) => {
    add(next,
        `risk:${i}`,
        'Progress Risk',
        `Top Risk: ${r.name}`,
        kw(r.name, r.area, r.delay, 'top risk'),
        {panel: 'pRisk', el: `[data-search-id="risk:${i}"]`}
    )
  })

  /* ---------- Cost & Claims 索赔类别 ---------- */
  const claimsCount = (db.cost && db.cost.claims && db.cost.claims.count) || []
  claimsCount.forEach(([name]) => {
    add(next,
        `claim:${name}`,
        'Cost & Claims',
        `Claim: ${name}`,
        kw(name, 'claim', 'claims', 'cost'),
        {panel: 'pCost', el: `[data-search-id="claim:${name}"]`}
    )
  })

  /* ---------- 主合同 kv（原为手工条目，现从 db 派生） ---------- */
  const mc = db.mainContract || {}
  MC_FIELDS.forEach(f => {
    const v = mc[f.field]
    if (v === undefined || v === null || v === '') return
    add(next,
        f.id,
        'Main Contract',
        `${f.label} — ${v}`,
        kw(f.k, v),
        {panel: 'pContract', el: `[data-search-id="${f.el}"]`, contractTab: 'main'}
    )
  })
  if (mc.grading) {
    add(next,
        'mc:gauge',
        'Main Contract',
        `Time Elapsed / Performance Grading ${mc.grading}`,
        kw('time elapsed performance grading', mc.grading),
        {panel: 'pContract', el: `[data-search-id="mc:gauge"]`, contractTab: 'main'}
    )
  }

  /* ---------- 安全/成本 kbox（原为手工条目，现从 db 派生） ---------- */
  const sf = db.safety || {}
  const cs = db.cost || {}
  const op = db.overallProgress || {}
  const kboxes = [
    {id: 's:mandaysM', cat: 'Safety', label: 'MANDAYS LOST · MONTH', v: sf.mandaysLostMonth, k: 'mandays lost month §14.3', panel: 'pSafety', el: 's:mandaysMonth'},
    {id: 's:mandaysC', cat: 'Safety', label: 'MANDAYS LOST · CUM.', v: sf.mandaysLostCum, k: 'mandays lost cum cumulative §14.4', panel: 'pSafety', el: 's:mandaysCum'},
    {id: 'c:wsoEot', cat: 'Cost & Claims', label: 'WSO EOT PACKAGES', v: cs.wsoEotPackages, k: 'wso eot packages §13.6', panel: 'pCost', el: 'c:wsoEot'},
    {id: 'c:maxEot', cat: 'Cost & Claims', label: 'MAX EOT · DAYS', v: cs.maxEotDays, k: 'max eot days', panel: 'pCost', el: 'c:maxEot'},
    {
      id: 'p:var',
      cat: 'Overall Progress',
      label: 'Variance',
      v: op.variancePct === undefined ? '' : `${op.variancePct}% ${op.varianceNote || ''}`.trim(),
      k: 'variance behind schedule weeks',
      panel: 'pProgress',
      el: 'p:info'
    }
  ]
  kboxes.forEach(b => {
    if (b.v === undefined || b.v === null || b.v === '') return
    add(next,
        b.id,
        b.cat,
        `${b.label} — ${b.v}`,
        kw(b.k, b.v),
        {panel: b.panel, el: `[data-search-id="${b.el}"]`}
    )
  })

  /* ---------- 纯 UI 文案 ---------- */
  PANEL_ENTRIES.forEach(m => {
    const action = {panel: m.panel}
    if (m.el) action.el = `[data-search-id="${m.el}"]`
    if (m.monthTab) action.monthTab = m.monthTab
    if (m.contractTab) action.contractTab = m.contractTab
    add(next, m.id, m.cat, m.t, kw(m.k, m.t), action)
  })

  index = next
  builtVersion = db.version
  builtPreview = db.isPreview
}

function ensureIndex() {
  if (builtVersion !== db.version || builtPreview !== db.isPreview || index.length === 0) {
    rebuildIndex()
  }
}

/**
 * 文本检索（线性过滤，索引 < 200 条）
 * @param {string} q 用户输入
 * @returns {Array<{id,category,title,keywords,action}>}
 */
export function search(q) {
  ensureIndex()
  const s = String(q || '').trim().toLowerCase()
  if (!s) return []
  return index.filter(it => it.keywords.includes(s))
}

export default {
  get list() {
    ensureIndex()
    return index
  }
}
