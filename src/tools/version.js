/**
 * 版本号提取
 *
 * RCID 模板里没有「本月」单元格，版本号从文件名解析（与业主的命名约定一致）。
 *
 * 当前示例文件名不含版本号：
 *   RCID DART - Data Inputs.xlsx
 *   DE152 AIP tracking list.xlsx
 * 需与业主约定命名，例如：
 *   RCID DART - Data Inputs 2026-11.xlsx
 *   DE152 AIP tracking list Apr 2026.xlsx
 */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

const pad = n => String(n).padStart(2, '0')

/**
 * 从文件名提取版本号
 * @param {string} filename 文件名或路径
 * @returns {{version: string|null, label: string|null, matched: string|null}}
 *          version 形如 '2026-11'
 */
export function parseVersionFromFilename(filename) {
  const base = String(filename || '').split(/[/\\]/).pop().replace(/\.[^.]+$/, '')

  // 2026-11 / 2026_11 / 2026.11
  let m = base.match(/(20\d{2})[-_.](\d{1,2})(?!\d)/)
  if (m) {
    const mm = +m[2]
    if (mm >= 1 && mm <= 12) {
      return {version: `${m[1]}-${pad(mm)}`, label: null, matched: m[0]}
    }
  }

  // 202611
  m = base.match(/(20\d{2})(\d{2})(?!\d)/)
  if (m) {
    const mm = +m[2]
    if (mm >= 1 && mm <= 12) {
      return {version: `${m[1]}-${pad(mm)}`, label: null, matched: m[0]}
    }
  }

  // Apr 2026 / April 2026 / 2026 Apr
  m = base.match(/([A-Za-z]{3,9})[\s_-]*(20\d{2})/)
  if (m) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mm) return {version: `${m[2]}-${pad(mm)}`, label: null, matched: m[0]}
  }
  m = base.match(/(20\d{2})[\s_-]*([A-Za-z]{3,9})/)
  if (m) {
    const mm = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mm) return {version: `${m[1]}-${pad(mm)}`, label: null, matched: m[0]}
  }

  return {version: null, label: null, matched: null}
}

/** 'YYYY-MM' → 界面上的报告月标签，如 'Apr 2026' */
export function versionToLabel(version) {
  const m = String(version || '').match(/^(20\d{2})-(\d{2})$/)
  if (!m) return version || ''
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[+m[2] - 1]} ${m[1]}`
}
