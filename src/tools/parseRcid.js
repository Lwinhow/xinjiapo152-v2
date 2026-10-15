/**
 * RCID DART - Data Inputs.xlsx 的通用结构解析
 *
 * 只做「把表格切成章节」这件事，不含任何看板语义 ——
 * 章节号 → 字段的映射在 assembleRcid.js 里。
 * 这样通用解析可以独立测试，模板微调时也只需改映射。
 *
 * 定位规则（不依赖颜色、不依赖绝对坐标）：
 *   1. 章节标题：A 列匹配 /^(\d+)(?:\.(\d+))?\.?\s+\S/
 *   2. 表头行：标题行自身若在 B..L 列还有内容，则它就是表头行（如 §13.3）；
 *      否则看下一行，但下一行若是章节标题则本section无表头（如 §13 本身）
 *   3. 有表头 → 明细表布局；无表头 → 键值表单布局
 *   4. 表头行 A 列的列名 = 标题去掉章节号后的文字（如 §9 的 'Area of Concerns'）
 */

const SECTION_RE = /^\s*(\d+)(?:\.(\d+))?\.?\s+(\S.*)$/

/**
 * 导入范围 —— 由原文件的黄色区域界定（行 2–102、117–196、235–248、255–257）。
 * 范围外的章节（§10 预后、§11 设计提交、§14.8 PGI、§15 ESS、§17.1/17.3–17.5、
 * §18 人力、§19 绿色）看板用不到，不对它们报警，避免噪音淹没真问题。
 */
export const IN_SCOPE = new Set([
  '1', '2', '2.1', '3', '4', '5', '6', '7', '8', '9',
  '12', '13', '13.1', '13.2', '13.3', '13.4', '13.5', '13.6', '13.7', '13.8',
  '14', '14.1', '14.2', '14.3', '14.4', '14.5', '14.6', '14.7',
  '16', '17.2'
])

/** 数值化的章节键：§9 → '9'，§13.3 → '13.3' */
function sectionKey(intPart, decPart) {
  return decPart ? `${intPart}.${decPart}` : String(intPart)
}

/** 折叠空白，供标签比对 */
const norm = s => String(s == null ? '' : s).replace(/[ 　]/g, ' ').replace(/\s+/g, ' ').trim()

function indexToCol(i) {
  let s = ''
  i += 1
  while (i > 0) {
    const r = (i - 1) % 26
    s = String.fromCharCode(65 + r) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

/** 单元格显示文本 */
function textOf(cell) {
  if (!cell) return ''
  if (cell.w !== undefined) return String(cell.w)
  if (cell.v === undefined || cell.v === null) return ''
  return String(cell.v)
}

/** 日期 → 'YYYY-MM-DD'；其余按文本处理 */
function isoDate(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/**
 * 百分比格式下的「小数写法」。
 *
 * 模板里 §12 的 Percentage 列是 0.00% 格式（numFmtId=10），同一列有两种填法：
 *   填 38  → Excel 存 38，显示 3800%
 *   填 38% → Excel 存 0.38，显示 38%
 * 两种都发生在合规操作下，但 0.38 原样输出会让看板把 38% 显示成 0.38%，
 * 属于静默错数据。表头写的是「Percentage (%)」，故以 38 为准，把小数写法还原。
 *
 * 判据取自单元格自身的格式（读取时需 cellNF:true），不绑列号 ——
 * 业主改模板格式时会自动跟随。整个导入区目前只有 §12 的 F119/F120 命中。
 */
function isPctFraction(cell) {
  return !!(cell && cell.z && cell.z.includes('%') &&
      typeof cell.v === 'number' && Math.abs(cell.v) <= 1)
}

/** 单元格 → 值。日期走 ISO；数值取原值；多行折成数组；空行丢弃 */
function valueOf(cell) {
  if (!cell) return ''
  if (cell.t === 'd' && cell.v instanceof Date) return isoDate(cell.v)
  // 数值取原始值而非显示文本：Amount 一类的列带货币格式（"$50,000.00"），
  // 显示文本无法直接参与求和、取最大值等派生计算
  if (cell.t === 'n' && typeof cell.v === 'number') {
    return isPctFraction(cell) ? Math.round(cell.v * 10000) / 100 : cell.v
  }
  const t = String(textOf(cell)).replace(/[ 　]/g, ' ')
  if (t.trim() === '') return ''
  const lines = t.split('\n').map(l => l.trim()).filter(l => l !== '')
  if (!lines.length) return ''
  return lines.length === 1 ? lines[0] : lines
}

/** 是否为数值（表头行判定时用来排除数据行） */
function isNumericCell(cell) {
  if (!cell) return false
  if (cell.t === 'n') return true
  if (cell.t === 'd') return true
  const v = cell.v
  return typeof v === 'number'
}

/**
 * @param {object} sheet SheetJS worksheet（cellText:true 读取）
 * @param {object} XLSX
 * @param {{maxCol?:number}} opts maxCol 默认取到 L 列（RCID 实际数据止于 L）
 * @returns {{sections: Object, order: string[], warnings: string[]}}
 */
export function parseRcidSheet(sheet, XLSX, opts = {}) {
  const warnings = []
  const maxCol = opts.maxCol || 12   // A..L
  const range = XLSX.utils.decode_range(sheet['!ref'])

  /*
   * 模板有 300+ 处合并单元格，值区往往横跨多列（B3:F3、B130:C130、A171:B171…）。
   * 不解析合并的话，只有左上角那一格读得到值，其余列读出来全是空。
   * 这里把每个格子映射到所属合并区的左上角。
   */
  const merges = (sheet['!merges'] || []).map(m => ({
    s: {r: m.s.r, c: m.s.c}, e: {r: m.e.r, c: m.e.c}
  }))
  const topLeft = new Map()
  merges.forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) topLeft.set(`${r}:${c}`, `${m.s.r}:${m.s.c}`)
    }
  })

  const rawCell = (r, c) => sheet[XLSX.utils.encode_cell({r, c})]
  const cell = (r, c) => {
    const key = topLeft.get(`${r}:${c}`)
    if (!key) return rawCell(r, c)
    const [tr, tc] = key.split(':').map(Number)
    return rawCell(tr, tc)
  }
  /** 该格所属合并区的左上角，用于把同一个合并区里重复读到的值去重 */
  const anchorOf = (r, c) => topLeft.get(`${r}:${c}`) || `${r}:${c}`

  /** 一行里所有互不相同的非空值单元格（B 列起），只认自身为合并区左上角的格子 */
  const valuesOfRow = r => {
    const out = []
    const seen = new Set()
    for (let c = 1; c < maxCol; c++) {
      const a = anchorOf(r, c)
      if (a !== `${r}:${c}`) continue    // 合并进来的，不是独立的值区
      if (seen.has(a)) continue
      seen.add(a)
      const v = valueOf(cell(r, c))
      if (v !== '') out.push({col: c, v})
    }
    return out
  }

  /*
   * 只统计「自身就是合并区左上角」的格子。
   * 标题行常被整行合并（如 A235:F235），若不排除，B..F 会继承 A 的标题文本，
   * 让标题行看起来像是表头行，导致表头判定整体错位。
   */
  const rowHasAny = r => {
    for (let c = 0; c < maxCol; c++) {
      if (c > 0 && anchorOf(r, c) !== `${r}:${c}`) continue
      if (textOf(cell(r, c)).trim() !== '') return true
    }
    return false
  }
  /** 该行 B 列起有几个互不相同的非空列名 */
  const countBeyondA = r => {
    let n = 0
    const seen = new Set()
    for (let c = 1; c < maxCol; c++) {
      const a = anchorOf(r, c)
      if (a !== `${r}:${c}`) continue    // 从别的格子合并过来的，不算独立列
      if (seen.has(a)) continue
      seen.add(a)
      if (textOf(cell(r, c)).trim() !== '') n++
    }
    return n
  }
  /**
   * 是否是多列表头行。
   * 门槛取 2 而不是 1：键值表单的取值行（如 §1 的 B3:F3 已填值）B 列起只有 1 个值区，
   * 若按「≥1」判定，填过值的表单会被整节误判成明细表。
   */
  const isHeaderRow = r => countBeyondA(r) >= 2

  /* ---- 1. 找出所有章节标题行 ---- */
  const candidates = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const a = cell(r, 0)
    if (!a) continue
    if (typeof a.v === 'number' || a.t === 'd') continue   // 排除月份/数字行
    const m = norm(textOf(a)).match(SECTION_RE)
    if (!m) continue
    candidates.push({
      row: r,
      major: +m[1],
      minor: m[2] === undefined ? -1 : +m[2],
      key: sectionKey(m[1], m[2]),
      title: norm(m[3])
    })
  }

  /*
   * 正文里的编号列表（如 §7 的「1. One flyover…」、§8 的「1. Key Achievements 1」）
   * 长得和章节标题一样。章节号一定是单调递增的，而正文列表会从 1 重新开始，
   * 据此把它们滤掉 —— 顺带也解决了重复键互相覆盖的问题。
   */
  const titles = []
  let lastMajor = -1
  let lastMinor = -1
  candidates.forEach(c => {
    const after = c.major > lastMajor || (c.major === lastMajor && c.minor > lastMinor)
    if (!after) return
    lastMajor = c.major
    lastMinor = c.minor
    titles.push(c)
  })

  if (!titles.length) warnings.push('No section titles recognized')

  /* ---- 2. 逐章节切分 ---- */
  const sections = {}
  const order = []

  titles.forEach((t, i) => {
    const end = (i + 1 < titles.length ? titles[i + 1].row : range.e.r + 1) - 1

    // 表头行：标题行自身有多个列名 → 就是它；否则看下一行，但下一行不能是章节标题
    let headerRow = null
    if (isHeaderRow(t.row)) {
      headerRow = t.row
    } else {
      const next = t.row + 1
      const nextIsTitle = titles.some(x => x.row === next)
      if (next <= end && !nextIsTitle && isHeaderRow(next)) headerRow = next
    }

    const base = {
      key: t.key,
      title: t.title,
      headerRow,
      firstRow: t.row,
      lastRow: end
    }

    if (headerRow === null) {
      /*
       * 键值表单：A 列是标签，B 起是值。
       * 例外是 §7「Main Civil Scope of Works」、§8「Key Achievements」这类内容型章节：
       * 正文整段写在 A 列，B 列为空，且整节只有这一行。此时按整段内容处理。
       */
      const filled = []
      for (let r = t.row + 1; r <= end; r++) {
        if (norm(textOf(cell(r, 0))) !== '') filled.push(r)
      }
      if (filled.length === 1 && valuesOfRow(filled[0]).length === 0) {
        sections[t.key] = {...base, layout: 'content', content: valueOf(cell(filled[0], 0))}
        order.push(t.key)
        return
      }

      /*
       * 值可能落在多个并列的合并区里：§3 的每行就有 B:C 和 D:F 两个值区，
       * 而标签只有一个。取第一个非空值区；两个都填了则告警，避免静默取错。
       */
      const kv = {}
      const ordered = []
      for (let r = t.row + 1; r <= end; r++) {
        const label = norm(textOf(cell(r, 0)))
        if (!label) continue
        const vals = valuesOfRow(r)
        if (vals.length > 1) {
          warnings.push(`§${t.key} "${label.slice(0, 30)}" fills ${vals.length} value ranges (columns ${vals.map(v => indexToCol(v.col)).join(', ')}), using the first one`)
        }
        kv[label] = vals.length ? vals[0].v : ''
        ordered.push(label)
      }
      sections[t.key] = {...base, layout: 'kv', kv, labels: ordered}
      order.push(t.key)
      return
    }

    /* 明细表：表头行的非空单元格给出列位置 */
    const columns = []
    const colSeen = new Set()
    for (let c = 0; c < maxCol; c++) {
      let label
      if (c === 0) {
        /*
         * A 列的列名：
         *   §9 / §13.3 这类标题行兼作表头行 → 标题去掉章节号即是列名（Area of Concerns、Progress Claim）
         *   §12 / §16 这类标题独占一行 → 表头在下一行，A 列是 Location / Month 等真实列名
         */
        label = headerRow === t.row ? t.title : norm(textOf(cell(headerRow, 0)))
      } else {
        // 合并区里的重复列只取左上角那一列，否则一个表头会被算成好几列
        const a = anchorOf(headerRow, c)
        if (a !== `${headerRow}:${c}`) continue
        label = norm(textOf(cell(headerRow, c)))
      }
      if (!label) continue
      const key = anchorOf(headerRow, c)
      if (colSeen.has(key)) continue
      colSeen.add(key)
      columns.push({col: c, label})
    }

    const rows = []
    for (let r = headerRow + 1; r <= end; r++) {
      if (!rowHasAny(r)) continue
      const obj = {__row: r + 1}   // 1-based 行号，便于核对
      columns.forEach(col => {
        const raw = cell(r, col.col)
        obj[col.label] = valueOf(raw)
        // 归一化改了数，必须让填报人看见，不能静默
        if (isPctFraction(raw)) {
          warnings.push(`§${t.key} row ${r + 1} "${col.label}" contains ${raw.v}`
              + ` (this column is percentage-formatted, shown as ${obj[col.label]}% in Excel) — adopted as ${obj[col.label]}%`)
        }
      })
      // 模板自带的示例行（首列以 eg. / e.g. 开头）不是填报数据
      const first = String(obj[columns[0].label] || '').trim()
      if (/^e\.?g\./i.test(first)) {
        // 但若别的列已填了内容，说明业主是在示例行上直接改的，
        // 漏删了 A 列的示例文字。静默丢弃会丢数据，必须提示。
        const filledOther = columns.slice(1).some(c => String(obj[c.label] || '').trim() !== '')
        if (filledOther && IN_SCOPE.has(t.key)) {
          warnings.push(`§${t.key} row ${r + 1}: the first column still holds the template example ("${first.slice(0, 24)}") while other columns are filled — row skipped, please remove the example text`)
        }
        continue
      }
      rows.push(obj)
    }

    sections[t.key] = {...base, layout: 'table', columns, rows}
    order.push(t.key)
  })

  return {sections, order, warnings}
}

/** 找 RCID 的填报 sheet（表名不固定时取第一个可见且非下拉字典的表） */
export function findRcidSheet(wb) {
  const prefer = wb.SheetNames.find(n => /2\.0|DE152/i.test(n))
  if (prefer) return wb.Sheets[prefer]
  const fallback = wb.SheetNames.find(n => !/dropdown/i.test(n))
  return wb.Sheets[fallback || wb.SheetNames[0]]
}

/**
 * 从既有数据里取出「位置 → 坐标」映射。
 *
 * RCID §12/§14 虽有 X/Y Coordinate 两列，但坐标是 WGS84（如 1.3656, 103.9528），
 * 而 3D 引擎用的是投影坐标（如 -1307366.3, 152295.4），两者不同制。
 * 且模板只给两列、没有 Z。故按位置名去库里取完整 XYZ，找不到的点位会告警。
 */
export function buildZLookup(baseline) {
  const map = {}
  const put = (key, co) => {
    if (key && Array.isArray(co) && co.length === 3) map[key] = {co}
  }
  ;((baseline.progressRisk && baseline.progressRisk.riskZones) || []).forEach(z => put(z.name, z.co))
  ;((baseline.safety && baseline.safety.safetyPoints) || []).forEach(p => put(p.cat, p.co))
  return map
}

/**
 * 完整解析：通用结构 + 看板语义组装
 * @param {object} wb   SheetJS 工作簿
 * @param {object} XLSX SheetJS 模块
 * @param {object} ctx  {baseline, reportingDate, label}
 */
export async function parseRcid(wb, XLSX, ctx = {}) {
  const {assembleRcid} = await import('./assembleRcid.js')
  const parsed = parseRcidSheet(findRcidSheet(wb), XLSX)
  const zByLocation = buildZLookup(ctx.baseline || {})
  const r = assembleRcid(parsed, {...ctx, zByLocation})
  return {
    data: r.data,
    warnings: [...parsed.warnings, ...r.warnings],
    sections: r.sections
  }
}
