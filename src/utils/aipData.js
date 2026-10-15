/**
 * DE152 AIP Tracking List —— 派生逻辑
 *
 * 原始数据已迁至 dashboard.json 的 aip.list（经 @/data/store 提供）。
 * 本模块只保留「原始单元格文本 → 面板展示值」的纯计算。
 *
 * 数据形状（与 RCID / AIP 原表行列一致）：
 *   固定列：no / name(AIP NAME) / preparedBy(Prepared by) / submissionRef(Submission reference number)
 *   轮次块 revs：'Rev-' / 'Rev A' / 'Rev B'（对应原表 E-L、M-T、U-AB 三块，每块8列）
 *     contractorExpected  Contractor Expected submission date
 *     contractorActual    (Actual) Contractor submission date
 *     ltaExpected         LTA expected submission date
 *     ltaActual           LTA actual submission date
 *     status              Status（LTA 审查状态）
 *     acExpected          AC expected submission date
 *     acActual            AC actual submission date
 *     acStatus            Status（AC 审查状态）
 *
 *   多行单元格 → 数组（每行一个元素，保留原文）；单行 → 字符串；空单元格 → ''
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** 解析 status 单元格（字符串或多行数组）→ {BES:'AC'|'REJ'|null, GTT:...} */
function parseStatusField(field) {
  const lines = Array.isArray(field) ? field : (field ? [field] : [])
  const out = {BES: null, GTT: null}
  lines.forEach(line => {
    const m = String(line).match(/^\s*(BES|GTT)\s*[:：]\s*(.+)$/i)
    if (!m) return
    const v = m[2].trim().toUpperCase()
    const key = m[1].toUpperCase()
    if (v.startsWith('REJ')) out[key] = 'REJ'
    else if (v === 'AC') out[key] = 'AC'
  })
  return out
}

/** 判断单元格值是否有实质内容（'Key:' 空占位行视为无内容） */
function hasRealContent(v) {
  if (Array.isArray(v)) return v.some(hasRealContent)
  const s = String(v || '').trim()
  if (!s) return false
  const m = s.match(/^[A-Za-z]+\s*[:：]\s*(.*)$/)
  return m ? m[1].trim() !== '' : true
}

/** 解析日期：'20 July 2026' / '2026/10/8' / '15-Oct-26' → {y, m, d} | null */
function parseAnyDate(s) {
  s = String(s || '').trim()
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) return {y: +m[3], m: mi, d: +m[1]}
  }
  m = s.match(/^(\d{1,2})[/-]([A-Za-z]+)[/-](\d{2,4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) {
      let y = +m[3]
      if (y < 100) y += 2000
      return {y, m: mi, d: +m[1]}
    }
  }
  m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (m) return {y: +m[1], m: +m[2] - 1, d: +m[3]}
  return null
}

function fmtDate(dt) {
  const mon = MONTHS[dt.m]
  const d = String(dt.d).padStart(2, '0')
  return `${d} ${mon.charAt(0).toUpperCase()}${mon.slice(1)}`
}

const REV_ORDER = ['Rev-', 'Rev A', 'Rev B']

/** 下一轮次（Rev- → Rev A → Rev B），已是最后一轮返回 null */
function nextRound(rev) {
  const i = REV_ORDER.indexOf(rev)
  return i >= 0 && i < REV_ORDER.length - 1 ? REV_ORDER[i + 1] : null
}

/** 当前轮次：从 Rev B → Rev A → Rev- 找第一个有实质数据的块 */
function getCurrentRev(row) {
  const order = [...REV_ORDER].reverse()
  const keys = ['contractorExpected', 'contractorActual', 'ltaExpected', 'ltaActual',
    'status', 'acExpected', 'acActual', 'acStatus']
  for (let i = 0; i < order.length; i++) {
    const block = row.revs[order[i]]
    if (block && keys.some(k => hasRealContent(block[k]))) {
      return {rev: order[i], block}
    }
  }
  return {rev: 'Rev-', block: row.revs['Rev-'] || {}}
}

/**
 * 行的下一个里程碑（统一格式：Rev 在前、LTA 居中、日期在后）：
 *   1. 当前轮次双方审查结论已出（BES/GTT 状态齐全，如 AC/REJ）→ 本轮已走完，下一轮准备中
 *      下一轮已有 LTA 预计日期 → 'Rev A · LTA · 08 Oct'
 *      否则 → 'Rev A prep · —'
 *   2. 当前轮次进行中 → 'Rev- · LTA · 31 Jul' / 'Rev A · LTA · 08 Oct'
 *   3. 尚未提交 → 'Rev- prep · —'
 */
function buildMilestone(row) {
  const {rev, block} = getCurrentRev(row)
  const s = parseStatusField(block.status)

  // 本轮双方结论已出 → 准备下一轮
  if (s.BES && s.GTT) {
    const next = nextRound(rev)
    if (!next) return '—'
    const d = parseAnyDate(row.revs[next].ltaExpected)
    return d ? `${next} · LTA · ${fmtDate(d)}` : `${next} prep · —`
  }

  // 本轮进行中：显示 LTA 预计日期
  let date = null
  if (rev === 'Rev-') {
    const lines = Array.isArray(block.ltaActual) ? block.ltaActual : (block.ltaActual ? [block.ltaActual] : [])
    lines.forEach(line => {
      const m = String(line).match(/^\s*(BES|GTT)\s*[:：]\s*(.+)$/i)
      if (!m) return
      const d = parseAnyDate(m[2])
      if (d && (!date || (d.y * 372 + d.m * 31 + d.d) < (date.y * 372 + date.m * 31 + date.d))) {
        date = d
      }
    })
  } else {
    date = parseAnyDate(block.ltaExpected)
  }
  if (date) return `${rev} · LTA · ${fmtDate(date)}`
  return block.contractorActual ? '—' : `${rev} prep · —`
}

/**
 * 由 Rev- 轮次状态派生统计：
 *   Full AC    = BES 与 GTT 均 AC
 *   Partial AC = 仅一侧 AC
 *   Rejected   = 双 REJ
 *   To Submit  = 尚无审查状态
 * @param {Array} aipList dashboard.json 的 aip.list
 */
export function buildAipStats(aipList = []) {
  let fullAc = 0
  let partialAc = 0
  let rejected = 0
  let toSubmit = 0
  aipList.forEach(row => {
    const s = parseStatusField(row.revs['Rev-'].status)
    if (!s.BES && !s.GTT) {
      toSubmit++
      return
    }
    if (s.BES === 'AC' && s.GTT === 'AC') fullAc++
    else if (s.BES === 'AC' || s.GTT === 'AC') partialAc++
    else rejected++
  })
  return [
    {n: fullAc, cls: 'good', borderCls: 'aip-b-green', label: 'Full AC'},
    {n: partialAc, cls: 'warn', borderCls: 'aip-b-warn', label: 'Partial AC'},
    {n: rejected, cls: 'bad', borderCls: 'aip-b-bad', label: 'Rejected'},
    {n: toSubmit, cls: '', borderCls: '', label: 'To Submit'}
  ]
}

/**
 * 面板表格行（基于当前轮次）：未提交/无状态显示 '—'
 * @param {Array} aipList dashboard.json 的 aip.list
 * @param {Object} shortNames no → 面板短名，随数据走
 */
export function buildAipRows(aipList = [], shortNames = {}) {
  const cls = s => (s === 'AC' ? 'b-good' : s === 'REJ' ? 'b-bad' : '')
  return aipList.map(row => {
    const s = parseStatusField(row.revs['Rev-'].status)
    return {
      no: row.no,
      name: shortNames[row.no] || (Array.isArray(row.name) ? row.name[0] : row.name),
      bes: s.BES,
      besCls: cls(s.BES),
      gtt: s.GTT,
      gttCls: cls(s.GTT),
      milestone: buildMilestone(row)
    }
  })
}

/**
 * 各轮次已有数据的 AIP 条数，供面板中部的 Rev 进度条使用。
 * @param {Array} aipList
 * @param {Array} revOrder 轮次顺序
 */
export function buildAipRevs(aipList = [], revOrder = REV_ORDER) {
  const keys = ['contractorExpected', 'contractorActual', 'ltaExpected', 'ltaActual',
    'status', 'acExpected', 'acActual', 'acStatus']
  return revOrder.map(name => ({
    name,
    n: aipList.filter(row => {
      const block = row.revs && row.revs[name]
      return block && keys.some(k => hasRealContent(block[k]))
    }).length
  }))
}
