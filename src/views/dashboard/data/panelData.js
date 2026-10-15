/**
 * 面板派生函数
 *
 * 数据已迁至 dashboard.json（经 @/data/store 提供），本模块只保留
 * 「原始数据 → 弹窗展示结构」的纯计算，不再持有任何静态数组。
 */

/**
 * 安全详情记录：按类目分组，供 RightPanels 的 openSafetyList 使用。
 * @param {Array} safetyPoints §14.1–§14.7 明细
 * @param {Object} titleMap 类目 → 标题，随填报内容走
 */
export function buildSafetyRecords(safetyPoints = [], titleMap = {}) {
  const records = {}
  safetyPoints.forEach(sp => {
    const fields = Object.keys(sp)
        .filter(k => !['co', 'cat', 'desc'].includes(k))
        .map(k => ({k, v: String(sp[k])}))
    records[sp.cat] = [{title: titleMap[sp.cat] || sp.cat, desc: sp.desc, fields}]
  })
  return records
}

/**
 * 进度风险记录：按风险等级分组，供 RightPanels 的 openSafetyList 使用。
 * @param {Array} zones §12 风险分区
 */
export function buildRiskRecords(zones = []) {
  const records = {}
  zones.forEach(z => {
    const fields = [
      {k: 'Element', v: z.el},
      {k: 'Completion', v: z.pct + '%'},
      {k: 'Risk of Delay', v: z.risk},
      {k: 'Reason', v: z.reason}
    ]
    if (z.remark) fields.push({k: 'Remarks', v: z.remark})
    ;
    (records[z.risk] = records[z.risk] || []).push({title: z.name, fields})
  })
  return records
}
