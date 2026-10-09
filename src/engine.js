// Auto-detects WebGPU → uses WebLLM (fast).
// Falls back to transformers.js WASM → works on iOS Safari, all Android, any browser.
//
// Model files are cached in the browser's Cache Storage by both libraries.
// They persist across refreshes and device restarts until the user clears browser data.
// Bump MODEL_VERSION to force a fresh download on an update.

export const MODEL_VERSION = 1
const WEBLLM_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC'
const WASM_MODEL   = 'onnx-community/Qwen2.5-0.5B-Instruct'
const CACHE_KEY    = 'kaya_model_cache_v1'

async function hasWebGPU() {
  try {
    if (!navigator.gpu) return false
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch { return false }
}

// ── Cache persistence ────────────────────────────────────────────────────────
// Reads the saved download record from localStorage.
// Returns null on first run, or { type, modelId, version } after first download.
export function getCacheInfo() {
  try {
    const v = localStorage.getItem(CACHE_KEY)
    return v ? JSON.parse(v) : null
  } catch { return null }
}

function saveCacheInfo(info) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(info)) } catch {}
}

// Verifies the cached model files still exist in Cache Storage (best-effort).
// Both libraries store their files there; we look for any cache entry whose
// URL contains the model name fragment.
async function isBrowserCacheValid(modelFragment) {
  try {
    const keys = await caches.keys()
    for (const key of keys) {
      const cache  = await caches.open(key)
      const reqs   = await cache.keys()
      if (reqs.some(r => r.url.includes(modelFragment))) return true
    }
  } catch { /* Cache API unavailable (private browsing, etc.) */ }
  return false
}

// ── Public API ───────────────────────────────────────────────────────────────
// Returns true when a cached download record exists AND matches the current
// model version.  The caller uses this to decide whether to skip the welcome
// screen and auto-start with a "from-cache" loading UI.
export async function isCached() {
  const info = getCacheInfo()
  if (!info || info.version !== MODEL_VERSION) return false

  // Extra check: confirm the files are still in Cache Storage
  const fragment = info.type === 'webgpu' ? 'Phi-3' : 'Qwen2'
  const valid = await isBrowserCacheValid(fragment)

  if (!valid) {
    // Cache was cleared — remove the stale record so the download restarts cleanly
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    return false
  }

  return true
}

// Creates and returns an AI engine object.
// onProgress(pct, text, type) is called during loading.
// fromCache — pass true when isCached() returned true so the UI shows
// "loading from cache" copy instead of download copy.
export async function createEngine(onProgress, fromCache = false) {
  const gpu = await hasWebGPU()

  if (gpu) {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    const engine = await CreateMLCEngine(WEBLLM_MODEL, {
      initProgressCallback: (p) => {
        const text = fromCache
          ? 'Loading from cache…'
          : (p.text || 'Downloading model…')
        onProgress(Math.round(p.progress * 100), text, 'webgpu')
      },
    })
    saveCacheInfo({ type: 'webgpu', modelId: WEBLLM_MODEL, version: MODEL_VERSION })
    return { type: 'webgpu', engine }
  }

  // WASM fallback — works on iOS Safari and all Android browsers
  onProgress(0, fromCache ? 'Loading from cache…' : 'Starting download (WASM mode)…', 'wasm')
  const { pipeline, TextStreamer } = await import('@huggingface/transformers')

  let lastPct = 0
  const generator = await pipeline('text-generation', WASM_MODEL, {
    dtype: 'q4',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100)
        if (pct !== lastPct) {
          lastPct = pct
          const text = fromCache ? 'Loading from cache…' : `Downloading… (${p.file || ''})`
          onProgress(pct, text, 'wasm')
        }
      } else if (p.status === 'done') {
        onProgress(100, fromCache ? 'Almost ready…' : 'Model downloaded!', 'wasm')
      }
    },
  })

  saveCacheInfo({ type: 'wasm', modelId: WASM_MODEL, version: MODEL_VERSION })
  return { type: 'wasm', engine: { generator, TextStreamer } }
}

// ── Chat streaming ───────────────────────────────────────────────────────────
export async function streamChat(engineObj, messages, onToken) {
  if (engineObj.type === 'webgpu') {
    const stream = await engineObj.engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 512,
    })
    let full = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) { full += delta; onToken(full) }
    }
    return full
  }

  // WASM path
  const { generator, TextStreamer } = engineObj.engine
  let full = ''
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (text) => { full += text; onToken(full) },
  })

  const prompt = generator.tokenizer.apply_chat_template(messages, {
    tokenize: false,
    add_generation_prompt: true,
  })

  await generator(prompt, {
    max_new_tokens: 512,
    temperature: 0.7,
    do_sample: true,
    streamer,
  })
  return full
}
