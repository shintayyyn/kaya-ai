// localStorage helpers — all reads/writes wrapped in try/catch

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
const write = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── History ──────────────────────────────────────────────
export const getHistory = () => read('kaya_history', [])

export const saveSession = (catId, messages) => {
  if (!messages.length) return
  const sessions = getHistory()
  sessions.unshift({
    id: Date.now(),
    catId,
    date: new Date().toISOString(),
    preview: messages[0]?.content?.slice(0, 80) || '',
    messages,
  })
  write('kaya_history', sessions.slice(0, 100)) // keep last 100
}

export const deleteSession = (id) => {
  write('kaya_history', getHistory().filter(s => s.id !== id))
}

export const clearHistory = () => write('kaya_history', [])

// ── Stats ─────────────────────────────────────────────────
export const getStats = () => read('kaya_stats', { totalChats: 0, streak: 1, lastDate: null, catCounts: {} })

export const bumpStats = (catId) => {
  const s = getStats()
  const today = new Date().toDateString()
  s.totalChats = (s.totalChats || 0) + 1
  s.catCounts = s.catCounts || {}
  s.catCounts[catId] = (s.catCounts[catId] || 0) + 1
  if (s.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    s.streak = s.lastDate === yesterday ? (s.streak || 1) + 1 : 1
    s.lastDate = today
  }
  write('kaya_stats', s)
}

// ── Settings ──────────────────────────────────────────────
export const getSettings = () => read('kaya_settings', {
  kayaName: 'Kaya',
  personality: 'friendly',   // friendly | professional | concise
  accentColor: '#7c3aed',
  language: 'en',
  defaultCat: 'general',
})

export const saveSettings = (s) => write('kaya_settings', s)
