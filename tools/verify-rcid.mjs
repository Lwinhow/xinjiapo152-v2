#!/usr/bin/env node
/**
 * RCID 解析器 + 派生算法对账
 *
 * 用 tools/make-sample-rcid.py 生成的「已填报」样本跑一遍，
 * 与手算的期望值逐项比对。原始模板是空白的，无法证伪；
 * 这份样本让 RCID 这条链路第一次真正可验证。
 *
 * 用法：node tools/verify-rcid.mjs [样本xlsx路径]
 */
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {parseRcid, parseRcidSheet} from '../src/tools/parseRcid.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SAMPLE = process.argv[2] || path.join(ROOT, '../RCID DART - Data Inputs 2025-04 sample.xlsx')
const BASELINE = path.join(ROOT, 'tools/fixtures/baseline-dashboard.json')

const baseline = JSON.parse(await readFile(BASELINE, 'utf8'))
const wb = XLSX.readFile(SAMPLE, {cellText: true, cellDates: true})

// 报告月 2025-04 → 填报日为月末
const r = await parseRcid(wb, XLSX, {
  baseline,
  reportingDate: new Date(Date.UTC(2025, 3, 30)),
  label: 'Apr 2025'
})
const d = r.data

/* ---------------- 期望值（按 make-sample-rcid.py 填的内容手算） ---------------- */

const EXPECT = [
  // §1 主合同
  ['mainContract.contractNo', d.mainContract.contractNo, 'DE152'],
  ['mainContract.contractor', d.mainContract.contractor, 'CES-SDC-KTC JV'],
  ['mainContract.contractSum', d.mainContract.contractSum, 'S$757 million'],
  ['mainContract.commencement', d.mainContract.commencement, '2024-06-01'],
  ['mainContract.completion', d.mainContract.completion, '2028-05-31'],
  ['mainContract.eotGranted', d.mainContract.eotGranted, '+62 days'],
  ['mainContract.projectStatus', d.mainContract.projectStatus, 'CONSTRUCTION'],
  ['mainContract.grading', d.mainContract.grading, 'GOOD'],
  // §1 起止 2024-06-01 → 2028-05-31 共 1460 天；填报日 2025-04-30 已过 333 天 → 22.8% → 23
  ['mainContract.timeElapsedPct', d.mainContract.timeElapsedPct, 23],
  // 近失累计来自 §2 的「No. of Near Miss Reported」
  ['mainContract.nearMissCum', d.mainContract.nearMissCum, 3],

  // §2–§6 支撑合同
  ['supportContracts.length', d.supportContracts.length, 5],
  ['support[QP(S)].contract', d.supportContracts[0].contract, 'DE152-QPS-01'],
  ['support[QP(S)].grading', d.supportContracts[0].grading, 'Excellent'],
  ['support[QP(S)].gradeColor', d.supportContracts[0].gradeColor, '#2eff9d'],
  ['support[AC].checkerName', d.supportContracts[1].checkerName, 'Dr. L. Ng'],
  ['support[AC].individualGrading', d.supportContracts[1].individualGrading, 'Good'],
  ['support[RI].riArchi', d.supportContracts[2].riArchi, 'Dr. A. Lim'],
  ['support[RI].riMne', d.supportContracts[2].riMne, 'Mr. B. Tan'],
  ['support[RI].riFse', d.supportContracts[2].riFse, 'Ms. C. Ng'],
  ['support[RI].indivGradingMne', d.supportContracts[2].indivGradingMne, 'Satisfactory'],
  ['support[IR].reviewerName', d.supportContracts[3].reviewerName, 'Prof. D. Ho'],
  ['support[INSTR.].instrConsultant', d.supportContracts[4].instrConsultant, 'Dr. E. Wong'],

  // §2.1 QSS（模板只有 4 个数据行）
  ['qssPosts.length', d.qssPosts.length, 4],
  ['qssPosts[0].name', d.qssPosts[0].name, 'Ir. W. Xu'],
  ['qssPosts[0].designation', d.qssPosts[0].designation, 'QPS (Civil)'],
  ['qssPosts[0].rating', d.qssPosts[0].rating, 'Good'],
  ['qssPosts[0].ratingColor', d.qssPosts[0].ratingColor, '#3fd2ff'],
  ['qssPosts[2].rating', d.qssPosts[2].rating, 'Excellent'],

  // §8 关键进展（整段写在 A 列，按行拆成数组）
  ['achievements.items.length', d.achievements.items.length, 5],
  ['achievements.items[0]', d.achievements.items[0], '1. Tunnel T2 roof slab cast'],

  // §9 关注事项
  ['concerns.length', d.concerns.length, 3],
  ['concerns[0].lv', d.concerns[0].lv, 'MAJOR'],
  ['concerns[0].cls', d.concerns[0].cls, 'b-bad'],
  ['concerns[1].lv', d.concerns[1].lv, 'MODERATE'],
  ['concerns[1].cls', d.concerns[1].cls, 'b-warn'],
  ['concerns[2].cls', d.concerns[2].cls, 'b-good'],
  ['concerns[0].m', d.concerns[0].m, 'Phased staging with LTA TMC; added night work windows'],

  // §12 风险点（坐标由 Location 匹配既有坐标表取得）
  ['riskZones.length', d.progressRisk.riskZones.length, 2],
  ['riskZones[0].name', d.progressRisk.riskZones[0].name, 'FB2'],
  ['riskZones[0].pct', d.progressRisk.riskZones[0].pct, 38],
  ['riskZones[0].risk', d.progressRisk.riskZones[0].risk, 'On Track'],
  ['riskZones[0].el', d.progressRisk.riskZones[0].el, 'Tunnel box / pump room'],
  ['riskZones[0].co.length', d.progressRisk.riskZones[0].co.length, 3],
  ['riskZones[1].name', d.progressRisk.riskZones[1].name, 'Xilin_Flyover'],
  ['riskZones[1].risk', d.progressRisk.riskZones[1].risk, 'High Risk'],
  ['riskZones[1].remark', d.progressRisk.riskZones[1].remark, 'Utility diversion approval lag'],

  // §13.1-13.2 WSO：Approved/Closed → 第3段，In Progress → 第2段
  ['cost.claims.count[WSO]', JSON.stringify(d.cost.claims.count[0][1]), '[0,2,2]'],
  // Progress Payment 求和：第2段 (400k+250k)=0.65→0.7；第3段 (1200k+300k)=1.5
  ['cost.claims.amt[WSO]', JSON.stringify(d.cost.claims.amt[0][1]), '[0,0.7,1.5]'],
  ['cost.claims.count[RFV]', JSON.stringify(d.cost.claims.count[1][1]), '[0,1,1]'],
  ['cost.claims.count[NC]', JSON.stringify(d.cost.claims.count[2][1]), '[0,1,0]'],
  ['cost.claims.count[NCN]', JSON.stringify(d.cost.claims.count[3][1]), '[0,1,1]'],

  // §13.3 进度款（S$M）
  ['cost.chart.months', JSON.stringify(d.cost.chart.months), '["Jan","Feb","Mar","Apr"]'],
  ['cost.chart.monthly', JSON.stringify(d.cost.chart.monthly), '[28,35,46,52]'],
  ['cost.chart.cumulative', JSON.stringify(d.cost.chart.cumulative), '[28,63,109,161]'],
  ['cost.chart.contractSum', d.cost.chart.contractSum, 757],

  // §13.6 EOT：3 个包，最大 95 天
  ['cost.wsoEotPackages', d.cost.wsoEotPackages, 3],
  ['cost.maxEotDays', d.cost.maxEotDays, 95],

  // §14 安全
  ['safety.safetyPoints.length', d.safety.safetyPoints.length, 7],
  ['safety.safetyPoints[0].cat', d.safety.safetyPoints[0].cat, 'Utility Damage'],
  ['safety.safetyPoints[0].co.length', d.safety.safetyPoints[0].co.length, 3],
  // §14.3 最近一次 2024-12-23，§14.4 最近一次 2025-04-20 → 距 2025-04-30 共 10 天
  ['safety.daysSinceLastMomAccident', d.safety.daysSinceLastMomAccident, 10],
  // 损失工日：15（§14.3）+ 3 + 2（§14.4）= 20，其中 4 月的 2 天计入当月
  ['safety.mandaysLostCum', d.safety.mandaysLostCum, 20],
  ['safety.mandaysLostMonth', d.safety.mandaysLostMonth, 2],
  ['safety.stats[Utility Damage].n', d.safety.stats[0].n, 1],
  ['safety.stats[Non-MOM].n', d.safety.stats[1].n, 1],
  ['safety.stats[MOM>3d].n', d.safety.stats[2].n, 1],
  ['safety.stats[MOM<3d].n', d.safety.stats[3].n, 2],
  ['safety.stats[Vector Control].n', d.safety.stats[6].n, 1],

  // §16 总体进度：Planned 由 Early 与 Late 的中点得出
  ['overallProgress.chart.early', JSON.stringify(d.overallProgress.chart.early),
    '[5,18,38,58,68,77,84,90,94,97,99,100]'],
  ['overallProgress.chart.late', JSON.stringify(d.overallProgress.chart.late),
    '[2,9,20,39,52,63,72,80,87,92,96,100]'],
  ['overallProgress.chart.actual', JSON.stringify(d.overallProgress.chart.actual),
    '[3,12,27,43,null,null,null,null,null,null,null,null]'],
  ['overallProgress.chart.planned', JSON.stringify(d.overallProgress.chart.planned),
    '[4,14,29,49,60,70,78,85,91,95,98,100]'],
  ['overallProgress.actualPct', d.overallProgress.actualPct, 43],
  ['overallProgress.plannedPct', d.overallProgress.plannedPct, 49],
  ['overallProgress.variancePct', d.overallProgress.variancePct, -6],
  ['overallProgress.varianceNote', d.overallProgress.varianceNote, '≈ 8 wks behind']
]

/* ---------------- §12 Percentage 列的两种填法 ----------------
 *
 * 该列是 0.00% 格式，填 38 存 38，填 38% 存 0.38。空模板里这格没有值，
 * 样本也只覆盖了前者，后者只能靠合成表覆盖 —— 写错时看板会把 38% 显示成
 * 0.38%，不报错、不上屏差异，属最难发现的一类。
 */
function pctSheet(storeValue) {
  return {
    '!ref': 'A1:L3',
    '!merges': [],
    A1: {t: 's', v: '12. Construction Progress'},
    A2: {t: 's', v: 'Location'},
    B2: {t: 's', v: 'Percentage (%)'},
    C2: {t: 's', v: 'Elements'},
    A3: {t: 's', v: 'FB2'},
    B3: {t: 'n', v: storeValue, z: '0.00%'},
    C3: {t: 's', v: 'Tunnel box'}
  }
}
const parsePct = v => {
  const r = parseRcidSheet(pctSheet(v), XLSX)
  return r.sections['12'].rows[0]['Percentage (%)']
}
EXPECT.push(
    ['§12 Percentage 填 38（存 38）', parsePct(38), 38],
    ['§12 Percentage 填 38%（存 0.38）', parsePct(0.38), 38],
    ['§12 Percentage 填 0.5%（存 0.005）', parsePct(0.005), 0.5]
)

/* ---------------- 比对 ---------------- */

console.log(`样本      : ${path.basename(SAMPLE)}`)
console.log(`章节数    : ${r.sections}`)
console.log(`解析告警  : ${r.warnings.length}`)
r.warnings.forEach(w => console.log(`  ⚠ ${w}`))
console.log()

let pass = 0
const fails = []
EXPECT.forEach(([label, actual, want]) => {
  const ok = actual === want
  if (ok) pass++
  else fails.push([label, actual, want])
})

console.log(`对账：${pass}/${EXPECT.length} 项通过`)
if (fails.length) {
  console.log('\n未通过：')
  fails.forEach(([l, a, w]) => {
    console.log(`  ✗ ${l}\n      实际 ${JSON.stringify(a)}\n      期望 ${JSON.stringify(w)}`)
  })
  process.exit(1)
}
console.log('✅ 全部通过')
