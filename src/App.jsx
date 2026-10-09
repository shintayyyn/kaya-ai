import { useState, useRef, useEffect, useCallback } from 'react'
import { createEngine, streamChat } from './engine'

/* ── Kaya Mascot SVG ── */
function KayaMascot({ size = 160, mood = 'happy', talking = false }) {
  const s = size
  return (
    <svg width={s} height={s * 1.2} viewBox="0 0 160 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </radialGradient>
        <radialGradient id="faceGrad" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ede9fe"/>
          <stop offset="100%" stopColor="#c4b5fd"/>
        </radialGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Glow beneath */}
      <ellipse cx="80" cy="185" rx="45" ry="8" fill="url(#glowGrad)" opacity="0.6"/>

      {/* Body */}
      <rect x="38" y="110" width="84" height="68" rx="20" fill="url(#bodyGrad)"/>
      {/* Body shine */}
      <rect x="50" y="116" width="28" height="8" rx="4" fill="rgba(255,255,255,.2)"/>

      {/* Arms */}
      <rect x="14" y="114" width="26" height="14" rx="7" fill="#5b21b6"/>
      <circle cx="12" cy="121" r="8" fill="#6d28d9"/>
      <rect x="120" y="114" width="26" height="14" rx="7" fill="#5b21b6"/>
      <circle cx="148" cy="121" r="8" fill="#6d28d9"/>

      {/* Legs */}
      <rect x="52" y="170" width="22" height="18" rx="8" fill="#4c1d95"/>
      <rect x="86" y="170" width="22" height="18" rx="8" fill="#4c1d95"/>

      {/* Antenna */}
      <rect x="77" y="16" width="6" height="28" rx="3" fill="#6d28d9"/>
      <circle cx="80" cy="12" r="8" fill="#a78bfa" filter="url(#glow)"/>
      <circle cx="80" cy="12" r="4" fill="#ede9fe"/>

      {/* Head */}
      <circle cx="80" cy="74" r="46" fill="url(#faceGrad)"/>
      {/* Head shine */}
      <ellipse cx="65" cy="52" rx="12" ry="7" fill="rgba(255,255,255,.35)" transform="rotate(-20 65 52)"/>

      {/* Ears */}
      <circle cx="32" cy="74" r="10" fill="#c4b5fd"/>
      <circle cx="32" cy="74" r="5" fill="#a78bfa"/>
      <circle cx="128" cy="74" r="10" fill="#c4b5fd"/>
      <circle cx="128" cy="74" r="5" fill="#a78bfa"/>

      {/* Eyes */}
      <g className="eye-blink" style={{transformOrigin:'58px 72px'}}>
        <circle cx="58" cy="72" r="12" fill="white"/>
        <circle cx="60" cy="72" r="7" fill="#1e1b4b"/>
        <circle cx="63" cy="69" r="2.5" fill="white"/>
      </g>
      <g className="eye-blink" style={{transformOrigin:'102px 72px',animationDelay:'.15s'}}>
        <circle cx="102" cy="72" r="12" fill="white"/>
        <circle cx="104" cy="72" r="7" fill="#1e1b4b"/>
        <circle cx="107" cy="69" r="2.5" fill="white"/>
      </g>

      {/* Mouth */}
      {mood === 'happy' && (
        <path d={talking ? "M 62 90 Q 80 102 98 90" : "M 62 88 Q 80 100 98 88"}
          stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" fill="none"
          style={talking ? {animation:'talk .4s ease-in-out infinite alternate'} : {}}/>
      )}
      {mood === 'thinking' && (
        <path d="M 66 90 Q 80 88 94 90" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      )}

      {/* Cheek blushes */}
      <ellipse cx="44" cy="82" rx="8" ry="5" fill="#f9a8d4" opacity="0.45"/>
      <ellipse cx="116" cy="82" rx="8" ry="5" fill="#f9a8d4" opacity="0.45"/>

      {/* Badge */}
      <rect x="56" y="124" width="48" height="18" rx="9" fill="rgba(255,255,255,.15)"/>
      <text x="80" y="136.5" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" letterSpacing="1">KAYA AI</text>
    </svg>
  )
}

/* ── Mascot Mini (chat avatar) ── */
function MascotMini({ size = 36, talking = false }) {
  return (
    <div className="flex-shrink-0 rounded-2xl flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
      <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="16" r="11" fill="#ede9fe"/>
        <circle cx="13" cy="15" r="2.8" fill="#1e1b4b"/>
        <circle cx="23" cy="15" r="2.8" fill="#1e1b4b"/>
        <circle cx="14.2" cy="13.8" r=".9" fill="white"/>
        <circle cx="24.2" cy="13.8" r=".9" fill="white"/>
        <path d={talking ? "M13 20 Q18 24 23 20" : "M13 19 Q18 23 23 19"}
          stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  )
}

/* ── Orb background ── */
function OrbBg({ cat }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="orb" style={{ width:340, height:340, top:-80, right:-80, background:`radial-gradient(circle,${cat.orb1}55,transparent 70%)`, animationDuration:'11s' }}/>
      <div className="orb" style={{ width:260, height:260, bottom:80, left:-60, background:`radial-gradient(circle,${cat.orb2}44,transparent 70%)`, animationDuration:'14s', animationDelay:'-4s' }}/>
      <div className="orb" style={{ width:180, height:180, top:'40%', left:'30%', background:`radial-gradient(circle,#7c3aed33,transparent 70%)`, animationDuration:'8s', animationDelay:'-2s' }}/>
    </div>
  )
}

/* ── Data ── */
const CATS = [
  { id:'cooking',  label:'Cooking',     emoji:'🍳', color:'#f97316', orb1:'#f97316', orb2:'#dc2626',
    desc:'Recipes, substitutes & techniques',
    prompts:['What can I cook with eggs and garlic?','Is this chicken fully cooked?','Substitute for baking soda?','Quick 15-min dinner ideas'],
    system:'You are Kaya, a friendly AI cooking assistant. Give practical, concise help with recipes, substitutions, techniques, and food safety. Be warm and encouraging.' },
  { id:'repair',   label:'Home Repair', emoji:'🔧', color:'#38bdf8', orb1:'#0ea5e9', orb2:'#6366f1',
    desc:'Step-by-step fixes & guides',
    prompts:['How do I fix a leaky faucet?','Unclog a drain without chemicals','Patch a hole in drywall','Why is my toilet running?'],
    system:'You are Kaya, a friendly AI home repair assistant. Give step-by-step guides, list tools needed, include safety tips. Be clear and reassuring.' },
  { id:'commute',  label:'Commuting',   emoji:'🚌', color:'#a78bfa', orb1:'#7c3aed', orb2:'#ec4899',
    desc:'Routes, productivity & tips',
    prompts:['Stay productive on the bus','Best packing for long commutes','Avoid rush hour stress','Healthy snacks for commuting'],
    system:'You are Kaya, a friendly AI commuting assistant. Give practical tips on routes, time management, packing, and staying productive while traveling.' },
  { id:'general',  label:'General',     emoji:'💡', color:'#34d399', orb1:'#10b981', orb2:'#06b6d4',
    desc:'Daily life, health & tips',
    prompts:['Remove a stain from clothing','Tips for better sleep','Save money on groceries','How to focus better at work'],
    system:'You are Kaya, a friendly AI life assistant. Answer questions about daily tasks, health, organization, and general knowledge. Be warm and concise.' },
]

export default function App() {
  const [screen, setScreen]         = useState('welcome')
  const [loadPct, setLoadPct]       = useState(0)
  const [loadText, setLoadText]     = useState('')
  const [engineType, setEngineType] = useState(null)
  const [catId, setCatId]           = useState('general')
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [generating, setGenerating] = useState(false)
  const [listening, setListening]   = useState(false)
  const engineRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const recogRef  = useRef(null)

  const cat = CATS.find(c => c.id === catId) || CATS[3]

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadModel = useCallback(async () => {
    setScreen('loading')
    try {
      const eng = await createEngine((pct, text, type) => {
        setLoadPct(pct); setLoadText(text)
        if (type) setEngineType(type)
      })
      engineRef.current = eng
      setEngineType(eng.type)
      setScreen('chat')
    } catch (e) { console.error(e); setScreen('error') }
  }, [])

  const send = useCallback(async (text) => {
    if (!text.trim() || generating || screen !== 'chat') return
    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    setGenerating(true)
    const allMsgs = [{ role: 'system', content: cat.system }, ...messages, userMsg]
    try {
      await streamChat(engineRef.current, allMsgs, (full) => {
        setMessages(prev => { const u=[...prev]; u[u.length-1]={role:'assistant',content:full}; return u })
      })
    } catch {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={role:'assistant',content:'⚠ Error. Please try again.'}; return u })
    } finally { setGenerating(false); inputRef.current?.focus() }
  }, [generating, screen, messages, cat])

  const switchCat = (id) => { setCatId(id); setMessages([]) }

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice not supported in this browser.'); return }
    if (listening) { recogRef.current?.stop(); return }
    const r = new SR(); r.lang='en-US'; r.interimResults=true
    r.onstart = () => setListening(true)
    r.onresult = (e) => setInput(Array.from(e.results).map(x=>x[0].transcript).join(''))
    r.onend = () => { setListening(false); }
    r.onerror = () => setListening(false)
    recogRef.current = r; r.start()
  }, [listening])

  if (screen === 'welcome') return <WelcomeScreen onStart={loadModel} />
  if (screen === 'loading') return <LoadingScreen pct={loadPct} text={loadText} engineType={engineType} />
  if (screen === 'error')   return <ErrorScreen onRetry={loadModel} />

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{background:'#06090f'}}>
      <OrbBg cat={cat}/>

      {/* ── Header ── */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase mb-0.5" style={{color:cat.color}}>Kaya AI</p>
          <h1 className="text-lg font-bold text-white">{cat.emoji} {cat.label}</h1>
        </div>
        <div className="glass rounded-2xl px-3 py-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{background:engineType==='webgpu'?'#34d399':'#60a5fa'}}/>
          <span className="text-xs font-medium text-white/70">{engineType==='webgpu'?'GPU':'WASM'} Local</span>
        </div>
      </header>

      {/* ── Mascot strip ── */}
      <div className="relative z-10 flex-shrink-0 flex items-end justify-center" style={{height:100}}>
        <div className="mascot-float" style={{marginBottom:-20}}>
          <KayaMascot size={90} mood={generating?'thinking':'happy'} talking={generating}/>
        </div>
        {generating && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-2xl px-3 py-1 anim-fade-in">
            <p className="text-xs text-white/60">Kaya is thinking…</p>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-6 pb-2 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 anim-fade-up">
            {/* Greeting bubble */}
            <div className="flex items-end gap-2">
              <MascotMini size={36}/>
              <div className="bubble-ai px-4 py-3 text-sm max-w-[78%]">
                Hi! I'm <span style={{color:cat.color}} className="font-semibold">Kaya</span> 👋 Your local AI assistant — running right on your device. What can I help with?
              </div>
            </div>
            {/* Quick prompts */}
            <div className="pl-11 flex flex-col gap-2">
              {cat.prompts.map((p,i) => (
                <button key={i} onClick={() => send(p)}
                  className="cat-pill text-left text-sm px-4 py-2.5 rounded-2xl glass anim-fade-up"
                  style={{animationDelay:`${.1+i*.07}s`,borderColor:`${cat.color}33`,color:'rgba(255,255,255,.85)'}}>
                  <span style={{color:cat.color}} className="mr-2">→</span>{p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role==='user'?'justify-end':'items-end gap-2'} msg-in`}
            style={{animationDelay:`${Math.min(i*20,150)}ms`}}>
            {msg.role === 'assistant' && <MascotMini size={34} talking={generating && i===messages.length-1}/>}
            <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${msg.role==='user'?'bubble-user':'bubble-ai'}`}>
              {msg.content
                ? <span className="whitespace-pre-wrap">{msg.content}</span>
                : (msg.role==='assistant' && generating && i===messages.length-1)
                  ? <div className="flex gap-1.5 items-center py-0.5"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                  : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-1"/>
      </div>

      {/* ── Input ── */}
      <div className="relative z-10 flex-shrink-0 glass-dark px-4 py-3">
        <div className="flex items-end gap-2 mb-3">
          <button onClick={startVoice}
            className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl transition-all active:scale-90 glass"
            style={{
              borderColor: listening ? 'rgba(239,68,68,.5)' : `${cat.color}44`,
              animation: listening ? 'micPulse 1s ease-in-out infinite' : 'none'
            }}>
            {listening ? '⏹' : '🎤'}
          </button>
          <div className="flex-1 glass rounded-3xl px-4 py-2.5 flex items-end gap-2" style={{minHeight:44}}>
            <textarea ref={inputRef} rows={1} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,110)+'px' }}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
              placeholder={`Ask Kaya about ${cat.label.toLowerCase()}…`}
              disabled={generating}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 resize-none leading-relaxed"
              style={{maxHeight:110}}/>
          </div>
          <button onClick={() => send(input)} disabled={!input.trim()||generating}
            className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-25"
            style={{background:input.trim()&&!generating?`linear-gradient(135deg,#4f46e5,#7c3aed)`:'rgba(255,255,255,.08)'}}>
            ↑
          </button>
        </div>

        {/* ── Bottom Nav ── */}
        <div className="flex gap-1">
          {CATS.map(c => (
            <button key={c.id} onClick={() => switchCat(c.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all active:scale-90"
              style={{background:catId===c.id?`${c.color}22`:'transparent'}}>
              <span className="text-base">{c.emoji}</span>
              <span className="text-xs font-medium" style={{color:catId===c.id?c.color:'rgba(255,255,255,.35)'}}>
                {c.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {listening && (
          <p className="text-center text-xs mt-2 anim-fade-in" style={{color:'#f87171'}}>
            🔴 Listening… tap ⏹ to send
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Welcome ── */
function WelcomeScreen({ onStart }) {
  return (
    <div className="flex flex-col min-h-full relative overflow-hidden" style={{background:'#06090f'}}>
      {/* Orbs */}
      <div className="orb" style={{width:400,height:400,top:-100,right:-80,background:'radial-gradient(circle,#7c3aed44,transparent 70%)',animationDuration:'12s'}}/>
      <div className="orb" style={{width:300,height:300,bottom:100,left:-80,background:'radial-gradient(circle,#4f46e544,transparent 70%)',animationDuration:'9s',animationDelay:'-3s'}}/>
      <div className="orb" style={{width:200,height:200,top:'45%',left:'20%',background:'radial-gradient(circle,#10b98133,transparent 70%)',animationDuration:'7s',animationDelay:'-5s'}}/>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-16 pb-10">
        {/* Top label */}
        <div className="anim-fade-in" style={{animationDelay:'.05s'}}>
          <span className="text-xs font-bold tracking-widest uppercase" style={{color:'#a78bfa'}}>AppBuildersPH · Local AI 2026</span>
        </div>

        {/* Mascot */}
        <div className="flex justify-center my-6 mascot-float anim-fade-up" style={{animationDelay:'.1s'}}>
          <KayaMascot size={148} mood="happy"/>
        </div>

        {/* Heading */}
        <div className="text-center mb-6 anim-fade-up" style={{animationDelay:'.18s'}}>
          <h1 className="text-4xl font-black text-white mb-2">
            Meet <span style={{background:'linear-gradient(135deg,#a78bfa,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Kaya</span>
          </h1>
          <p className="text-white/50 text-base">Your everyday AI — runs 100% on your device.<br/>Private. Offline. Always with you.</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8 anim-fade-up" style={{animationDelay:'.24s'}}>
          {['🍳 Cooking','🔧 Repairs','🚌 Commute','💡 Daily Life'].map(f => (
            <span key={f} className="glass rounded-2xl px-3 py-1.5 text-sm text-white/70 font-medium">{f}</span>
          ))}
        </div>

        <div className="flex gap-2 justify-center text-xs text-white/30 mb-8 anim-fade-up" style={{animationDelay:'.3s'}}>
          <span>🔒 100% private</span><span>·</span><span>✈️ Works offline</span><span>·</span><span>📱 iOS & Android</span>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 px-6 pb-12 anim-slide-up" style={{animationDelay:'.35s'}}>
        <button onClick={onStart}
          className="w-full py-4 rounded-3xl font-bold text-base text-white transition-all active:scale-95"
          style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',boxShadow:'0 8px 32px rgba(124,58,237,.45)'}}>
          Start chatting with Kaya →
        </button>
        <p className="text-center text-xs text-white/25 mt-3">Auto-selects GPU or WASM · ~500MB first download</p>
      </div>
    </div>
  )
}

/* ── Loading ── */
function LoadingScreen({ pct, text, engineType }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center relative overflow-hidden" style={{background:'#06090f'}}>
      <div className="orb" style={{width:350,height:350,top:-50,left:'50%',transform:'translateX(-50%)',background:'radial-gradient(circle,#7c3aed33,transparent 70%)'}}/>
      <div className="relative z-10 mascot-float mb-6">
        <KayaMascot size={120} mood="thinking"/>
      </div>
      <h2 className="text-xl font-bold text-white mb-1 relative z-10">Waking up Kaya…</h2>
      {engineType && (
        <span className="text-xs px-3 py-1 rounded-full mb-4 font-semibold glass relative z-10" style={{color:engineType==='webgpu'?'#34d399':'#60a5fa'}}>
          {engineType==='webgpu'?'⚡ GPU mode — fast':'🔄 WASM mode — all devices'}
        </span>
      )}
      <p className="text-sm text-white/40 mb-8 max-w-xs leading-relaxed relative z-10">{text||'Initializing…'}</p>
      <div className="w-full max-w-xs relative z-10">
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{background:'rgba(255,255,255,.08)'}}>
          <div className="progress-bar h-full rounded-full" style={{width:`${pct}%`,background:'linear-gradient(90deg,#4f46e5,#a78bfa)',boxShadow:'0 0 12px #7c3aed88'}}/>
        </div>
        <p className="font-black text-2xl" style={{color:'#a78bfa'}}>{pct}%</p>
      </div>
      <p className="text-xs text-white/20 mt-4 relative z-10">Cached after first download · Never sent anywhere</p>
    </div>
  )
}

/* ── Error ── */
function ErrorScreen({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center" style={{background:'#06090f'}}>
      <div className="text-5xl mb-4 anim-fade-in">😵</div>
      <h2 className="text-xl font-bold text-white mb-2">Kaya couldn't wake up</h2>
      <p className="text-white/40 text-sm mb-6 max-w-xs">The model download may have failed. You need internet for the first download, then it works offline.</p>
      <p className="text-xs text-white/25 mb-8">iOS Safari 16+ or Chrome 113+ required for best support.</p>
      <button onClick={onRetry} className="px-8 py-3 rounded-2xl font-bold text-white active:scale-95 transition-all"
        style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}>
        Try Again
      </button>
    </div>
  )
}
