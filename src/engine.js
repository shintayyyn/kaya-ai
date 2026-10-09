// Auto-detects WebGPU → uses WebLLM (fast).
// Falls back to transformers.js WASM → works on iOS Safari, all Android, any browser.

const WEBLLM_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC'
const WASM_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct'

async function hasWebGPU() {
  try {
    if (!navigator.gpu) return false
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}

export async function createEngine(onProgress) {
  const gpu = await hasWebGPU()

  if (gpu) {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    const engine = await CreateMLCEngine(WEBLLM_MODEL, {
      initProgressCallback: (p) => onProgress(Math.round(p.progress * 100), p.text || 'Loading model…', 'webgpu'),
    })
    return { type: 'webgpu', engine }
  }

  // WASM fallback — works on iOS Safari, all Android
  onProgress(0, 'Using WASM mode (compatible with all devices)…', 'wasm')
  const { pipeline, TextStreamer } = await import('@huggingface/transformers')

  let lastPct = 0
  const generator = await pipeline('text-generation', WASM_MODEL, {
    dtype: 'q4',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100)
        if (pct !== lastPct) {
          lastPct = pct
          onProgress(pct, `Downloading model… (${p.file || ''})`, 'wasm')
        }
      }
    },
  })

  return { type: 'wasm', engine: { generator, TextStreamer } }
}

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
