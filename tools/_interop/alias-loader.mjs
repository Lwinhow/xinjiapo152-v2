/**
 * 让 Node 能直接 import 项目里的 src 模块：
 *   - 解析 webpack 的 '@/' 别名（panelData.js 用了它）
 *   - 补 .js 后缀
 * 仅用于脚本期数据快照，不参与前端构建。
 */
// 本文件位于 tools/_interop/，项目根在上两级
const SRC = new URL('../../src/', import.meta.url)

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const target = new URL(specifier.slice(2), SRC)
    if (!/\.[a-z]+$/i.test(target.pathname)) target.pathname += '.js'
    return next(target.href, context)
  }
  return next(specifier, context)
}
