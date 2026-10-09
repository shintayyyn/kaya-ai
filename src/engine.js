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

// ── Public API ───────────────────────────────────────────────────────────────
// Returns true when a completed download has been recorded for the current
// model version.  We trust localStorage alone — both WebLLM and Transformers.js
// manage their own Cache Storage internally, and we don't need to second-guess
// them.  If the user manually cleared browser cache the library will simply
// re-download during createEngine() and saveCacheInfo() updates the record.
export function isCached() {
  const info = getCacheInfo()
  return !!(info && info.version === MODEL_VERSION)
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
