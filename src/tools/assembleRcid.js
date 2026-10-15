/**
 * RCID 章节 → 看板数据段
 *
 * 派生算法的依据见方案文档第二节。原则：JSON 只存填报的原始值，
 * 展示量（计数、百分比、天数、环比）一律在此算出。
 *
 * 有几处无法从 RCID 推导，取值来源已在代码里逐条标注，并在 warnings 中提示。
 */

const num = v => {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const isNum = v => v !== '' && v !== null && v !== undefined && Number.isFinite(num(v))
const str = v => (v === null || v === undefined ? '' : String(v))

/** 'YYYY-MM-DD' → Date（UTC），非法返回 null */
const toDate = s => {
  const m = str(s).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = d => (d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '')

/** 等级 → 展示色，与既有配色一致 */
const GRADE_COLOR = {
  EXCELLENT: '#2eff9d', GOOD: '#3fd2ff', SATISFACTORY: '#ffd83d',
  UNSATISFACTORY: '#ff6b6b', POOR: '#ff6b6b'
}
const gradeColor = g => GRADE_COLOR[str(g).trim().toUpperCase()] || '#8fc6ea'

/** 日期格式化为 'YYYY-MM' 供按月分组 */
const ym = d => (d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` : '')

/* ------------------------------------------------------------------ */
/* 章节 → 字段映射                                                     */
/* ------------------------------------------------------------------ */

/** §2–§6 支撑合同。role 与既有面板一致；section 为 RCID 章节号 */
const SUPPORT_CONTRACTS = [
  {
    section: '2', role: 'QP(S)',
    map: {
      'Contract Number': 'contract', 'Subgroup': 'subgroup', 'Division': 'division',
      'Contract title': 'contractTitle', 'Consultant': 'consultant', 'Contract Sum': 'contractSum',
      'Contract Commencement Date': 'commencement', 'Contract Completion Date': 'completion',
      'Officer in Charge': 'pic', 'Officer in Charge Representative': 'picRep',
      'Overall Company Performance Grading': 'grading', 'No. of Near Miss Reported': 'nearMiss'
    }
  },
  {
    section: '3', role: 'AC',
    map: {
      'Contract Number': 'contract', 'Subgroup': 'subgroup', 'Division': 'division',
      'Contract title': 'contractTitle', 'Consultant': 'consultant',
      'Name of Accredited Checker': 'checkerName', 'Contract Sum': 'contractSum',
      'Contract Commencement Date': 'commencement', 'Contract Completion Date': 'completion',
      'Officer in Charge': 'pic', 'Officer in Charge Representative': 'picRep',
      'Overall Company Performance Grading': 'grading', 'Individual Performance Grading': 'individualGrading'
    }
  },
  {
    section: '4', role: 'RI',
    map: {
      'Contract Number': 'contract', 'Subgroup': 'subgroup', 'Division': 'division',
      'Contract title': 'contractTitle', 'Consultant': 'consultant', 'Contract Sum': 'contractSum',
      'Name of Registered Inspector (Archi)': 'riArchi',
      'Name of Registered Inspector (M&E)': 'riMne',
      'Name of Registered Inspector (FSE)': 'riFse',
      'Contract Commencement Date': 'commencement', 'Contract Completion Date': 'completion',
      'Officer in Charge': 'pic', 'Officer in Charge Representative': 'picRep',
      'Overall Company Performance Grading': 'grading',
      'Individual Performance Grading RI Archi': 'indivGradingArchi',
      'Individual Performance Grading RI M&E': 'indivGradingMne',
      'Individual Performance Grading RI FSE': 'indivGradingFse'
    }
  },
  {
    section: '5', role: 'IR',
    map: {
      'Contract Number': 'contract', 'Subgroup': 'subgroup', 'Division': 'division',
      'Contract title': 'contractTitle', 'Consultant': 'consultant', 'Contract Sum': 'contractSum',
      'Name of Independent Reviewer': 'reviewerName',
      'Contract Commencement Date': 'commencement', 'Contract Completion Date': 'completion',
      'Officer in Charge': 'pic', 'Officer in Charge Representative': 'picRep',
      'Performance Grading': 'grading'
    }
  },
  {
    section: '6', role: 'INSTR.',
    map: {
      'Contract Number': 'contract', 'Subgroup': 'subgroup', 'Division': 'division',
      'Contract title': 'contractTitle', 'Consultant': 'consultant',
      'Name of Instrumentation Consultant': 'instrConsultant', 'Contract Sum': 'contractSum',
      'Contract Commencement Date': 'commencement', 'Contract Completion Date': 'completion',
      'Officer in Charge': 'pic', 'Officer in Charge Representative': 'picRep',
      'Overall Company Performance Grading': 'grading', 'Individual Performance Grading': 'individualGrading'
    }
  }
]

/** 需要跟色值的字段：数据键 → 色值键 */
const COLORED = {
  grading: 'gradeColor',
  individualGrading: 'individualGradeColor',
  indivGradingArchi: 'indivGradingArchiColor',
  indivGradingMne: 'indivGradingMneColor',
  indivGradingFse: 'indivGradingFseColor'
}

/**
 * §14 安全类目 → marker 用的 cat 名。
 * RCID 的表头措辞与看板的类目名不完全一致，需要对齐。
 */
const SAFETY_CATS = [
  {section: '14.1', cat: 'Utility Damage'},
  {section: '14.2', cat: 'Non-MOM Incident'},
  {section: '14.3', cat: 'MOM ≥ 3d MC'},
  {section: '14.4', cat: 'MOM < 3d MC'},
  {section: '14.5', cat: 'Env. Infringement'},
  {section: '14.6', cat: 'Near Miss (Cat A)'},
  {section: '14.7', cat: 'Vector Control'}
]

/** 索赔状态 → 面板三段（Submitted / Under Review / Approved·Closed） */
function claimBucket(status) {
  const s = str(status).trim().toLowerCase()
  if (!s) return 0
  if (/approv|closed|settled|completed|amicable/.test(s)) return 2
  if (/progress|pending|issued|open|review|substantiation/.test(s)) return 1
  return 0
}

/* ------------------------------------------------------------------ */
/* 组装                                                               */
/* ------------------------------------------------------------------ */

/**
 * @param {object} parsed parseRcidSheet 的结果
 * @param {object} ctx    {baseline, zByLocation, reportingDate}
 * @returns {{data: object, warnings: string[], sections: number}}
 */
export function assembleRcid(parsed, ctx = {}) {
  const {sections} = parsed
  const warnings = []
  const S = k => sections[k]
  const kv = k => (S(k) && S(k).layout === 'kv' ? S(k).kv : {})
  const rows = k => (S(k) && S(k).layout === 'table' ? S(k).rows : [])
  const content = k => (S(k) && S(k).layout === 'content' ? S(k).content : '')
  const need = (k, why) => {
    if (!S(k)) warnings.push(`缺少章节 §${k}（${why}），该段数据未更新`)
    return !!S(k)
  }

  const baseline = ctx.baseline || {}
  const zByLocation = ctx.zByLocation || {}

  /* ---------- §1 主合同 ---------- */
  const mc = kv('1')
  const reportingDate = ctx.reportingDate || null

  let timeElapsedPct = 0
  const start = toDate(mc['Contract Commencement Date'])
  const end = toDate(mc['Contract Completion Date'])
  if (start && end && reportingDate && end > start) {
    const r = Math.min(Math.max((reportingDate - start) / (end - start), 0), 1)
    timeElapsedPct = Math.round(r * 100)
  } else if (start && end && end > start) {
    warnings.push('§1 缺少可用的填报日期，Time Elapsed 无法计算，暂置 0')
  }

  // 主合同的近失累计：RCID 只有各支撑合同各自的「No. of Near Miss Reported」，取合计
  const nearMissCum = SUPPORT_CONTRACTS.reduce((a, c) => a + num(kv(c.section)['No. of Near Miss Reported']), 0)

  const mainContract = {
    contractNo: str(mc['Contract Number']),
    contractor: str(mc['Contractor']),
    contractSum: str(mc['Contract Sum']),
    commencement: str(mc['Contract Commencement Date']),
    completion: str(mc['Contract Completion Date']),
    eotGranted: str(mc['Extension of Time (EOT) Date']),
    projectStatus: str(mc['Project Status']),
    projectTeam: str(mc['Project Team']),
    nearMissCum: nearMissCum || (baseline.mainContract && baseline.mainContract.nearMissCum) || 0,
    grading: str(mc['Performance Grading']).toUpperCase(),
    timeElapsedPct
  }

  /* ---------- §2–§6 支撑合同 ---------- */
  const baseByRole = {}
  ;(baseline.supportContracts || []).forEach(c => { baseByRole[c.role] = c })

  const supportContracts = SUPPORT_CONTRACTS.map(def => {
    need(def.section, `支撑合同 ${def.role}`)
    const raw = kv(def.section)
    const out = {...(baseByRole[def.role] || {role: def.role})}
    const fieldMap = def.map
    Object.entries(fieldMap).forEach(([label, key]) => {
      if (!(label in raw)) {
        if (S(def.section)) warnings.push(`§${def.section} 缺少字段「${label}」，${def.role} 的 ${key} 保留原值`)
        return
      }
      const v = raw[label]
      out[key] = key === 'nearMiss' ? num(v) : v
    })
    Object.entries(COLORED).forEach(([dk, ck]) => {
      if (out[dk]) out[ck] = gradeColor(out[dk])
    })
    return out
  })

  /* ---------- §2.1 QSS 岗位 ---------- */
  const qssSection = S('2.1')
  const baseQss = baseline.qssPosts || []
  const qssPosts = qssSection
      ? qssSection.rows.map((row, i) => {
        const cols = qssSection.columns.map(c => c.col)
        const get = re => {
          const col = qssSection.columns.find(c => re.test(c.label))
          return col ? row[col.label] : ''
        }
        const rating = str(get(/performance\s*rating/i))
        return {
          post: (baseQss[i] && baseQss[i].post) || str(get(/designation/i)).split(/\s*\(/)[0] || `QSS-${i + 1}`,
          name: str(get(/^QSS Team|name/i)),
          designation: str(get(/designation/i)),
          regNo: str(get(/reg\s*no/i)),
          rating,
          ratingColor: gradeColor(rating),
          remarks: str(get(/remarks/i))
        }
      })
      : []
  if (!qssSection) warnings.push('缺少 §2.1 QSS 团队表，该段未更新')

  /* ---------- §8 关键进展 / §9 关注事项 ---------- */
  const achv = content('8')
  if (!S('8')) warnings.push('缺少 §8 关键进展，该段未更新')
  const achievementsItems = Array.isArray(achv) ? achv : (achv ? [achv] : [])

  const concerns = rows('9').map(r => {
    const cols = S('9').columns
    const val = re => {
      const c = cols.find(x => re.test(x.label))
      return c ? str(r[c.label]) : ''
    }
    const cat = val(/categor/i).toUpperCase()
    return {
      lv: cat || 'MINOR',
      cls: cat === 'MAJOR' ? 'b-bad' : cat === 'MODERATE' ? 'b-warn' : 'b-good',
      t: val(/area of concern|concern/i),
      m: val(/mitigation/i)
    }
  }).filter(c => c.t)

  /* ---------- §12 施工进度 → 地图风险点 ---------- */
  const zoneRows = rows('12')
  const riskZones = []
  if (S('12')) {
    const cols = S('12').columns
    const val = (r, re) => {
      const c = cols.find(x => re.test(x.label))
      return c ? r[c.label] : ''
    }
    zoneRows.forEach(r => {
      const name = str(val(r, /location/i))
      if (!name) return
      const base = (baseline.progressRisk && baseline.progressRisk.riskZones || [])
          .find(z => z.name === name) || zByLocation[name]
      if (!base || !base.co) {
        warnings.push(`§12 第 ${r.__row} 行的「${name}」在既有坐标表里找不到，该点未上图（需补 XYZ 坐标）`)
        return
      }
      riskZones.push({
        co: base.co,
        name,
        el: str(val(r, /elements/i)),
        pct: num(val(r, /percentage/i)),
        risk: str(val(r, /risk of delay/i)) || 'On Track',
        reason: str(val(r, /reason/i)),
        remark: str(val(r, /remark/i))
      })
    })
  }

  /* ---------- §13 成本与索赔 ---------- */
  const wsoIn = rows('13.1')
  const wsoEx = rows('13.2')
  const rfv = rows('13.4')
  const nc = rows('13.5')
  const ncn = rows('13.7')

  /**
   * 按状态分桶计数。secKey 必须显式传 —— 早先靠 `list === wsoIn` 反推章节，
   * 合并成 wsoAll 之后就推不出来了，会错取到 §13.7 的状态列。
   */
  const bucketCount = (list, secKey, statusRe) => {
    const segs = [0, 0, 0]
    if (!S(secKey)) return segs
    const col = S(secKey).columns.find(c => statusRe.test(c.label))
    if (!col) {
      warnings.push(`§${secKey} 找不到状态列，索赔计数未统计`)
      return segs
    }
    list.forEach(r => { segs[claimBucket(r[col.label])]++ })
    return segs
  }

  const wsoAll = [...wsoIn, ...wsoEx]
  const claimsCount = [
    ['WSO', bucketCount(wsoAll, '13.1', /status/i)],
    ['RFV / VO', bucketCount(rfv, '13.4', /status/i)],
    ['Notified Claim', bucketCount(nc, '13.5', /status/i)],
    ['NCN', bucketCount(ncn, '13.7', /status/i)]
  ]

  // 金额：WSO 取 Progress Payment，RFV 取 VO Payment，NC 取 NC Amount，NCN 无金额
  const bucketAmt = (list, secKey, statusRe, amtRe) => {
    const segs = [0, 0, 0]
    if (!S(secKey)) return segs
    const cols = S(secKey).columns
    const stCol = cols.find(c => statusRe.test(c.label))
    const amCol = cols.find(c => amtRe.test(c.label))
    list.forEach(r => {
      const b = stCol ? claimBucket(r[stCol.label]) : 0
      segs[b] += amCol ? num(r[amCol.label]) / 1e6 : 0
    })
    return segs.map(v => Math.round(v * 10) / 10)
  }
  const claimsAmt = [
    ['WSO', bucketAmt(wsoAll, '13.1', /wso\s*status|status/i, /progress\s*payment/i)],
    ['RFV / VO', bucketAmt(rfv, '13.4', /rfv\s*status|status/i, /vo.*payment|variation order/i)],
    ['Notified Claim', bucketAmt(nc, '13.5', /nc\s*status|status/i, /nc\s*amount/i)],
    ['NCN', [0, 0, 0]]
  ]

  // §13.3 进度款：最近 4 个有金额的月份
  const claimRows = rows('13.3').filter(r => {
    const c = S('13.3').columns.find(x => /amount/i.test(x.label) && !/cumulative/i.test(x.label))
    return c && isNum(r[c.label]) && num(r[c.label]) > 0
  })
  const costCols = (S('13.3') || {columns: []}).columns
  const monthCol = costCols.find(c => c.col === 0)
  const amtCol = costCols.find(c => /^amount$/i.test(c.label))
  const cumCol = costCols.find(c => /cumulative/i.test(c.label))
  const last4 = claimRows.slice(-4)
  // 合同总额是整列同一个常数，取第一个非空即可（不会每行重复填）
  const sumLabel = (costCols.find(c => /total contract sum/i.test(c.label)) || {}).label
  const contractSumCell = sumLabel
      ? (rows('13.3').find(r => isNum(r[sumLabel])) || {})[sumLabel]
      : ''
  const costChart = {
    months: last4.map(r => {
      const d = toDate(r[monthCol ? monthCol.label : ''])
      return d ? MONTHS[d.getUTCMonth()] : ''
    }),
    monthly: last4.map(r => Math.round(num(r[amtCol ? amtCol.label : '']) / 1e6 * 10) / 10),
    cumulative: last4.map(r => Math.round(num(r[cumCol ? cumCol.label : '']) / 1e6 * 10) / 10),
    contractSum: isNum(contractSumCell)
        ? Math.round(num(contractSumCell) / 1e6 * 10) / 10
        : (baseline.cost && baseline.cost.chart && baseline.cost.chart.contractSum) || 0
  }
  if (!isNum(contractSumCell)) {
    warnings.push('§13.3 未填 Total Contract Sum，造价图基准线沿用上一版数值')
  }

  // §13.6 WSO EOT
  const eotRows = rows('13.6')
  const eotCol = (S('13.6') || {columns: []}).columns.find(c => /eot.*days/i.test(c.label))
  const eotDays = eotRows.map(r => num(r[eotCol ? eotCol.label : ''])).filter(n => n > 0)

  const cost = {
    claims: {count: claimsCount, amt: claimsAmt},
    chart: costChart,
    wsoEotPackages: eotRows.length,
    maxEotDays: eotDays.length ? Math.max(...eotDays) : 0
  }

  /* ---------- §14 安全 ---------- */
  const baseSafetyPoints = (baseline.safety && baseline.safety.safetyPoints) || []
  const safetyPoints = []
  SAFETY_CATS.forEach(({section, cat}) => {
    if (!S(section)) {
      warnings.push(`缺少 §${section}（${cat}），该条安全记录未更新`)
      return
    }
    const cols = S(section).columns
    const dataRows = rows(section)
    if (!dataRows.length) return
    // 一条类目一行；模板首行通常是示例行
    const r = dataRows[0]
    const base = baseSafetyPoints.find(p => p.cat === cat) ||
        zByLocation[cat]
    if (!base || !base.co) {
      warnings.push(`§${section}（${cat}）在既有坐标表里找不到对应点位，未上图`)
      return
    }
    const obj = {co: base.co, cat, desc: ''}
    cols.forEach(c => {
      if (c.col === 0) {
        obj.desc = str(r[c.label])
      } else {
        obj[c.label] = r[c.label]
      }
    })
    safetyPoints.push(obj)
  })

  // 距上次 MOM 可报告事故天数
  const momDates = ['14.3', '14.4'].flatMap(k => {
    if (!S(k)) return []
    const c = S(k).columns.find(x => /occurrence\s*date/i.test(x.label))
    if (!c) return []
    return rows(k).map(r => toDate(r[c.label])).filter(Boolean)
  })
  let daysSinceLastMomAccident = 0
  if (momDates.length && reportingDate) {
    const last = new Date(Math.max(...momDates.map(d => d.getTime())))
    daysSinceLastMomAccident = Math.max(0, Math.round((reportingDate - last) / 86400000))
  } else if (!momDates.length) {
    daysSinceLastMomAccident = (baseline.safety && baseline.safety.daysSinceLastMomAccident) || 0
  }

  // 损失工日
  const mandays = ['14.3', '14.4'].flatMap(k => {
    if (!S(k)) return []
    const mCol = S(k).columns.find(x => /mandays\s*lost/i.test(x.label))
    const dCol = S(k).columns.find(x => /occurrence\s*date/i.test(x.label))
    if (!mCol) return []
    return rows(k).map(r => ({
      days: num(r[mCol.label]),
      date: dCol ? toDate(r[dCol.label]) : null
    }))
  })
  const reportYm = ym(reportingDate)
  const mandaysLostCum = mandays.reduce((a, m) => a + m.days, 0)
  const mandaysLostMonth = mandays
      .filter(m => reportYm && ym(m.date) === reportYm)
      .reduce((a, m) => a + m.days, 0)

  // 类目计数与环比（环比需上一版，单份表出不来）
  const prevCounts = (ctx.prevCounts) || null
  const safetyStats = SAFETY_CATS.map(({section, cat}) => {
    const n = S(section) ? rows(section).length : 0
    const prev = prevCounts && prevCounts[cat] !== undefined ? prevCounts[cat] : null
    let delta = 'flat'
    let deltaText = '— MoM'
    if (prev !== null) {
      const d = n - prev
      delta = d > 0 ? 'up' : d < 0 ? 'down' : 'flat'
      deltaText = d === 0 ? '— MoM' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} MoM`
    }
    return {
      cat, n,
      nCls: cat === 'MOM ≥ 3d MC' ? 'bad'
          : cat === 'Near Miss (Cat A)' ? 'good'
              : (cat === 'Utility Damage' || cat === 'Vector Control') ? 'warn' : '',
      delta,
      deltaText
    }
  })

  const safety = {
    daysSinceLastMomAccident,
    stats: safetyStats,
    mandaysLostMonth,
    mandaysLostCum,
    titleMap: (baseline.safety && baseline.safety.titleMap) || {},
    safetyPoints
  }

  /* ---------- §16 总体进度 ---------- */
  const pCols = (S('16') || {columns: []}).columns
  const pc = re => pCols.find(c => re.test(c.label))
  const cMonth = pc(/^overall progress|month/i)
  const cEarly = pc(/early\s*\(%\)/i)
  const cLate = pc(/late\s*\(%\)/i)
  const cActual = pc(/actual\s*\(%\)/i)
  const cEarlyVar = pc(/early\s*variance/i)
  const cLateVar = pc(/late\s*variance/i)

  const p16 = rows('16')
  const pick = (col, r) => (col && isNum(r[col.label]) ? num(r[col.label]) : null)
  const early = p16.map(r => pick(cEarly, r))
  const late = p16.map(r => pick(cLate, r))
  const actual = p16.map(r => pick(cActual, r))
  // Planned 为 early 与 late 的中点 —— 详见方案文档 2.2 的拟合过程
  const planned = early.map((e, i) => (e === null || late[i] === null ? null : Math.round((e + late[i]) / 2)))

  const lastIdx = (arr) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null) return i
    return -1
  }
  const ai = lastIdx(actual)
  const actualPct = ai >= 0 ? actual[ai] : 0
  const plannedPct = ai >= 0 ? (planned[ai] === null ? 0 : planned[ai]) : 0
  const variancePct = Math.round((actualPct - plannedPct) * 10) / 10

  let varianceNote = ''
  if (ai >= 0) {
    const w = pick(cEarlyVar, p16[ai])
    if (w !== null) varianceNote = `≈ ${w} wks behind`
  }

  const overallProgress = {
    actualPct,
    plannedPct,
    variancePct,
    varianceNote,
    chart: {
      months: p16.map(r => {
        const d = toDate(r[cMonth ? cMonth.label : ''])
        return d ? MONTHS[d.getUTCMonth()] : ''
      }),
      early, late, actual, planned
    }
  }

  /* ---------- 产出 ---------- */
  return {
    data: {
      mainContract,
      supportContracts,
      qssPosts,
      achievements: {month: ctx.label || '', items: achievementsItems},
      concerns,
      progressRisk: {
        riskZones,
        // §12 只有工期风险标签与原因，没有「延误天数」和「趋势」两列，
        // topRisks 无法从 RCID 推导，沿用既有值
        topRisks: (baseline.progressRisk && baseline.progressRisk.topRisks) || []
      },
      cost,
      safety,
      overallProgress,
      monitors: baseline.monitors || []
    },
    warnings,
    sections: parsed.order.length
  }
}
