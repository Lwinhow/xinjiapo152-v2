/**
 * AIP Tracking List 解析器
 *
 * 输入：DE152 AIP tracking list.xlsx 的 AIP sheet
 * 输出：dashboard.json 的 aip 段落
 *
 * 定位方式完全不依赖颜色和绝对坐标：
 *   - 轮次分组从第 3 行的合并单元格取（E3:L3 / M3:T3 / U3:AB3）
 *   - 子列名从第 4 行取，按组内位置映射到字段，同时校验列名以捕捉模板漂移
 *   - 数据行从第 5 行起，No 列为数字即视为有效行
 */

/** 每个轮次块内的列序（与第 4 行顺序一一对应） */
const REV_FIELDS = [
  {key: 'contractorExpected', re: /contractor\s*expected/i},
  {key: 'contractorActual', re: /contractor\s*actual|actual\s*contractor/i},
  {key: 'ltaExpected', re: /lta\s*expected/i},
  {key: 'ltaActual', re: /lta\s*actual/i},
  {key: 'status', re: /^status$/i},
  {key: 'acExpected', re: /ac\s*expected/i},
  {key: 'acActual', re: /ac\s*actual/i},
  {key: 'acStatus', re: /^status$/i}
]

/** 固定列（第 3 行的单格表头） */
const FIXED_FIELDS = [
  {key: 'no', re: /^no$/i},
  {key: 'name', re: /aip\s*name/i},
  {key: 'preparedBy', re: /prepared\s*by/i},
  {key: 'submissionRef', re: /submission\s*reference/i}
]

/** 折叠不间断空格与连续空白，用于标签比对 */
const norm = s => String(s == null ? '' : s).replace(/[ 　]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * 轮次组名归一化。
 *
 * 表里写的是「Rev -」（带空格），而 aipData.js 的 REV_ORDER 与 LeftPanels
 * 的弹窗字段都按「Rev-」取值，键不统一会导致整块数据读不到。
 * 这里把常见的几种写法收敛到规范形式。
 */
function canonRev(label) {
  const s = norm(label)
  if (/^rev\s*[-0]?$/i.test(s)) return 'Rev-'
  const m = s.match(/^rev\s*([A-Z])$/i)
  if (m) return `Rev ${m[1].toUpperCase()}`
  return s
}

/** 取单元格的显示文本（保留 Excel 的格式，如日期 '3-Jul-26'） */
function textOf(cell) {
  if (!cell) return ''
  if (cell.w !== undefined) return String(cell.w)
  if (cell.v === undefined || cell.v === null) return ''
  return String(cell.v)
}

/**
 * 日期型单元格 → 'YYYY-MM-DD'
 *
 * 不采用 Excel 的显示文本：模板里同一列混用 d-mmm-yy 与 mm-dd-yy 两种格式，
 * 后者在跨区域设置下会被读成 日/月，存在真实歧义。取数值本身最稳。
 */
function isoDate(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/**
 * 单元格 → 数据值
 * 日期 → ISO 字符串；多行 → 数组；单行 → 字符串；空 → ''
 * 单元格内的空行视为排版噪声，一律丢弃。
 */
function valueOf(cell) {
  if (!cell) return ''
  if (cell.t === 'd' && cell.v instanceof Date) return isoDate(cell.v)
  const t = String(textOf(cell)).replace(/[ 　]/g, ' ')
  if (t.trim() === '') return ''
  const lines = t.split('\n').map(l => l.trim()).filter(l => l !== '')
  if (!lines.length) return ''
  return lines.length === 1 ? lines[0] : lines
}

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

/**
 * @param {object} sheet SheetJS 的 worksheet（需以 cellText:true 读取）
 * @param {object} XLSX SheetJS 模块
 * @returns {{data: object, warnings: string[]}}
 */
export function parseAip(sheet, XLSX) {
  const warnings = []
  const range = XLSX.utils.decode_range(sheet['!ref'])

  const cell = (r, c) => sheet[XLSX.utils.encode_cell({r, c})]

  const HEADER_ROW = 2      // 第 3 行：固定列名 + 轮次组名
  const SUBHEADER_ROW = 3   // 第 4 行：轮次块内的子列名
  const FIRST_DATA_ROW = 4  // 第 5 行起为数据

  const merges = (sheet['!merges'] || []).map(m => ({
    s: {r: m.s.r, c: m.s.c}, e: {r: m.e.r, c: m.e.c}
  }))

  // 第 3 行起始、横向合并的区域 = 轮次分组。
  // 模板右侧还有 AC3:AH3 / AI3:AN3 两个空标签的预留组，按标签为空过滤掉。
  const allGroups = merges
      .filter(m => m.s.r === HEADER_ROW && m.e.c > m.s.c)
      .map(m => ({label: norm(textOf(cell(m.s.r, m.s.c))), c0: m.s.c, c1: m.e.c}))
      .map(g => ({...g, rev: canonRev(g.label)}))
      .sort((a, b) => a.c0 - b.c0)

  const groups = allGroups.filter(g => g.label !== '')
  allGroups.filter(g => g.label === '').forEach(g => {
    const hasSub = (() => {
      for (let c = g.c0; c <= g.c1; c++) if (norm(textOf(cell(SUBHEADER_ROW, c)))) return true
      return false
    })()
    if (hasSub) warnings.push(`Rev group at column ${indexToCol(g.c0)} has no group name but its sub-columns are labeled — skipped`)
  })

  if (!groups.length) warnings.push('No named rev groups (merged cells) found on row 3')

  /* ---- 固定列 A..D ---- */
  const fixedByKey = {}
  FIXED_FIELDS.forEach((f, i) => {
    const label = norm(textOf(cell(HEADER_ROW, i)))
    if (label && !f.re.test(label)) {
      warnings.push(`Fixed column ${i + 1} header is "${label}", expected to match ${f.re}`)
    }
    fixedByKey[f.key] = i
  })

  /* ---- 组内子列 → 字段 ---- */
  const groupCols = groups.map(g => {
    const cols = []
    for (let c = g.c0; c <= g.c1; c++) {
      const label = norm(textOf(cell(SUBHEADER_ROW, c)))
      const idx = c - g.c0
      const spec = REV_FIELDS[idx]
      if (!spec) {
        warnings.push(`Rev "${g.label}" column ${idx + 1} (${indexToCol(c)}) exceeds the expected 8 fields, label "${label}"`)
        cols.push({key: null, c, label})
        continue
      }
      if (label && !spec.re.test(label)) {
        warnings.push(`Rev "${g.label}" column ${idx + 1} (${indexToCol(c)}) label is "${label}", expected ${spec.key}`)
      }
      cols.push({key: spec.key, c, label})
    }
    if (cols.length !== REV_FIELDS.length) {
      warnings.push(`Rev "${g.label}" has ${cols.length} sub-columns, expected ${REV_FIELDS.length}`)
    }
    return {name: g.rev, rawLabel: g.label, cols}
  })

  /* ---- 数据行 ---- */
  const list = []
  for (let r = FIRST_DATA_ROW; r <= range.e.r; r++) {
    const noCell = cell(r, fixedByKey.no)
    const noRaw = noCell && noCell.v !== undefined && noCell.v !== null ? noCell.v : textOf(noCell)
    if (noRaw === '' || noRaw === null || noRaw === undefined) continue
    const no = Number(noRaw)
    if (!Number.isFinite(no)) continue

    const row = {
      no,
      name: valueOf(cell(r, fixedByKey.name)),
      preparedBy: valueOf(cell(r, fixedByKey.preparedBy)),
      submissionRef: valueOf(cell(r, fixedByKey.submissionRef)),
      revs: {}
    }

    groupCols.forEach(g => {
      const block = {}
      g.cols.forEach(col => {
        if (col.key) block[col.key] = valueOf(cell(r, col.c))
      })
      REV_FIELDS.forEach(f => {
        if (block[f.key] === undefined) block[f.key] = ''
      })
      row.revs[g.name] = block
    })

    list.push(row)
  }

  if (!list.length) warnings.push('No data rows parsed')

  return {
    data: {
      revOrder: groupCols.map(g => g.name),
      list
    },
    warnings
  }
}

/** 从工作簿里找 AIP sheet（表名不固定时按名称兜底） */
export function findAipSheet(wb) {
  if (wb.Sheets['AIP']) return wb.Sheets['AIP']
  const name = wb.SheetNames.find(n => /aip/i.test(n))
  return name ? wb.Sheets[name] : wb.Sheets[wb.SheetNames[0]]
}
