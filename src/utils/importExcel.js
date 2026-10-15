/**
 * 浏览器端的 Excel → dashboard 数据
 *
 * 解析器与 CLI 共用同一份代码（@/tools/*），这里只负责
 * 「读文件 → 调解析器 → 合并到基线」的编排。
 */
import * as XLSX from 'xlsx'
import {parseAip, findAipSheet} from '@/tools/parseAip'
import {parseRcid} from '@/tools/parseRcid'
import {parseVersionFromFilename, versionToLabel} from '@/tools/version'

/** File → ArrayBuffer */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error(`Failed to read: ${file.name}`))
    r.readAsArrayBuffer(file)
  })
}

async function openWorkbook(file) {
  const buf = await readFile(file)
  // cellNF 必开，理由同 tools/xlsx2json.mjs：§12 的 Percentage 列是百分比格式
  return XLSX.read(new Uint8Array(buf),
      {type: 'array', cellText: true, cellDates: true, cellNF: true})
}

/** 报告月月末，作为 §16 进度与 §14 事故天数的基准日 */
function monthEnd(version) {
  const [y, m] = String(version).split('-').map(Number)
  return new Date(Date.UTC(y, m, 0))
}

/**
 * 由上传的文件组装完整 dashboard 数据
 * @param {{aip?:File, rcid?:File, version?:string, baseline:object}} input
 * @returns {Promise<{doc:object, warnings:string[], version:string, label:string, sources:string[]}>}
 */
export async function buildDocFromFiles(input) {
  const {aip, rcid, baseline} = input
  if (!aip && !rcid) throw new Error('Select at least one Excel file')
  if (!baseline) throw new Error('Missing baseline data, cannot merge')

  let version = input.version || ''

  if (!version) {
    for (const f of [aip, rcid].filter(Boolean)) {
      const r = parseVersionFromFilename(f.name)
      if (r.version) {
        version = r.version
        break
      }
    }
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(version)) {
    throw new Error('Cannot determine the reporting month — fill in Filling Month manually, e.g. 2026-11')
  }

  const doc = JSON.parse(JSON.stringify(baseline))
  const warnings = []
  const sources = []
  const label = versionToLabel(version)

  doc.meta = {
    ...(doc.meta || {}),
    version,
    label,
    generatedAt: new Date().toISOString(),
    source: []
  }

  if (aip) {
    const wb = await openWorkbook(aip)
    const r = parseAip(findAipSheet(wb), XLSX)
    doc.aip = {...(doc.aip || {}), ...r.data}
    warnings.push(...r.warnings.map(w => `[AIP] ${w}`))
    sources.push(aip.name)
  }

  if (rcid) {
    const wb = await openWorkbook(rcid)
    const r = await parseRcid(wb, XLSX, {baseline: doc, reportingDate: monthEnd(version), label})
    Object.assign(doc, r.data)
    warnings.push(...r.warnings.map(w => `[RCID] ${w}`))
    sources.push(rcid.name)
  }

  doc.meta.source = sources

  return {doc, warnings, version, label, sources}
}

/** 触发浏览器下载 */
export function downloadJson(doc, filename) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `dashboard-${doc.meta.version}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 预览态存本机。刷新后由 store 自动读取，方便先自查再决定是否正式发布。
 * 只影响当前浏览器，其他访问者看到的仍是服务器上的版本。
 */
const PREVIEW_KEY = 'de152:preview'

export function savePreview(doc) {
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(doc))
}

export function loadPreview() {
  try {
    const s = localStorage.getItem(PREVIEW_KEY)
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}

export function clearPreview() {
  localStorage.removeItem(PREVIEW_KEY)
}

/**
 * 上传到服务端，写入正式版本。
 *
 * 没有口令。这个入口本身靠 URL 上的 ?import=1 才出现，面向的是现场运维，
 * 不是公开接口；服务端也只应挂在内部网络。真要限制写入，在反代层面加。
 */
export async function uploadToServer(doc) {
  const res = await fetch(`${(process.env.BASE_URL || '/').replace(/^\.\//, '/')}api/versions`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      version: doc.meta.version,
      label: doc.meta.label,
      source: (doc.meta.source || []).join(' + '),
      data: doc
    })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}
