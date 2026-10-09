# Kaya AI 🤖

> **AppBuildersPH Hackathon 2026 — Local AI**

Your everyday AI assistant for cooking, home repairs, commuting & daily life — runs **100% on your device**. No internet required after the first model download.

---

## Why local AI?

- 🔒 **Private** — your questions never leave your phone
- ✈️ **Offline** — works on the MRT, in the province, anywhere
- ⚡ **Fast** — no cloud round-trips, instant responses
- 💸 **Free forever** — no API fees, no subscription
- 📱 **Any device** — iOS, Android, desktop

---

## Features

- **Kaya mascot** — animated SVG character with blinking eyes and talking mouth
- **4 categories** — Cooking, Home Repair, Commuting, General
- **Voice input** — speak your question, Kaya listens
- **Auto engine selection** — WebGPU (fast) on capable devices, WASM fallback on iOS/all browsers
- **PWA** — installable on home screen like a native app
- **Capacitor ready** — build to iOS `.ipa` or Android `.apk`

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Local AI (GPU) | WebLLM — Phi-3.5 Mini via WebGPU |
| Local AI (fallback) | `@huggingface/transformers` — Qwen2.5-0.5B via WASM |
| Styling | Tailwind CSS v4 |
| PWA | `vite-plugin-pwa` |
| Native packaging | Capacitor (iOS + Android) |

---

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — on first load, tap **Start chatting with Kaya** to download the AI model (~500MB, cached after that).

## Build for production

```bash
npm run build
```

## Build native app (iOS / Android)

```bash
npm run build
npx cap sync
npx cap open ios      # opens Xcode
npx cap open android  # opens Android Studio
```

---

## Submission — AppBuildersPH Hackathon 2026

**Why does this product benefit from running AI locally?**

Kaya AI is designed for real Filipino everyday life — cooking in the kitchen without a laptop nearby, fixing things around the house, commuting on the MRT with spotty signal. Running AI locally means:

1. **Privacy** — household and personal questions stay on the device, always
2. **Offline-first** — works anywhere, including areas with poor or no connectivity
3. **No cost barrier** — no subscription, no per-query charges
4. **Instant** — no server latency, responses start immediately

---

Built with [Claude Code](https://claude.ai/claude-code) · AppBuildersPH Hackathon 2026
