/**
 * 用法：node --import ./tools/_interop/register.mjs <脚本>
 *
 * marker.js 在模块顶层读 window.location.origin，Node 里没有 window，
 * 必须在任何 src 模块被求值之前补上桩。
 */
globalThis.window = {location: {origin: 'http://localhost'}}

import {register} from 'node:module'
register('./alias-loader.mjs', import.meta.url)
