/* 账户表：明文仅作前端门禁演示，不做真正的安全防护，后端接口仍需自行鉴权 */
export const ACCOUNTS = [
  {username: 'admin', password: 'admin123'},
  {username: 'test1', password: 'test1'},
  {username: 'test2', password: 'test2'},
  {username: 'test3', password: 'test3'},
  {username: 'test4', password: 'test4'},
  {username: 'test5', password: 'test5'},
]

const SESSION_KEY = 'de152_auth'

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function login(username, password) {
  const ok = ACCOUNTS.some(a => a.username === username && a.password === password)
  if (ok) sessionStorage.setItem(SESSION_KEY, '1')
  return ok
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}
