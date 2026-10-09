import { useState, useRef, useEffect, useCallback } from 'react'
import { createEngine, streamChat, isCached, getCacheInfo, MODEL_VERSION } from './engine'
import { getHistory, saveSession, deleteSession, clearHistory, getStats, bumpStats, getSettings, saveSettings } from './store'

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */
const CATS = [
  { id:'cooking',  label:'Cooking',     emoji:'🍳', color:'#f97316', orb1:'#f97316', orb2:'#dc2626',
    desc:'Recipes & techniques',
    prompts:["What can I cook with eggs and garlic?","Is this chicken fully cooked?","Substitute for baking soda?","Quick 15-min dinner ideas"],
    system:'You are {name}, a friendly AI cooking assistant. Be practical and encouraging. Help with recipes, substitutions, techniques, and food safety.',
  },
  { id:'repair',   label:'Home Repair', emoji:'🔧', color:'#38bdf8', orb1:'#0ea5e9', orb2:'#6366f1',
    desc:'Fixes & step-by-step guides',
    prompts:["How to fix a leaky faucet?","Unclog a drain without chemicals","Patch a hole in drywall","Why is my toilet running?"],
    system:'You are {name}, a friendly AI home repair assistant. Give step-by-step guides, list tools needed, include safety tips.',
  },
  { id:'commute',  label:'Commuting',   emoji:'🚌', color:'#a78bfa', orb1:'#7c3aed', orb2:'#ec4899',
    desc:'Routes & productivity tips',
    prompts:["Stay productive on the bus","Best packing for long commutes","Avoid rush hour stress","Healthy snacks for commuting"],
    system:'You are {name}, a friendly AI commuting assistant. Give practical tips on routes, time management, and productivity while traveling.',
  },
  { id:'general',  label:'General',     emoji:'💡', color:'#34d399', orb1:'#10b981', orb2:'#06b6d4',
    desc:'Daily life & health tips',
    prompts:["Remove a stain from clothing","Tips for better sleep","Save money on groceries","How to focus better at work"],
    system:'You are {name}, a friendly AI life assistant. Answer questions about daily tasks, health, organization, and general knowledge.',
  },
]

const TABS = [
  { id:'home',      label:'Home',      icon:'🏠' },
  { id:'chat',      label:'Chat',      icon:'💬' },
  { id:'history',   label:'History',   icon:'🕐' },
  { id:'customize', label:'Style',     icon:'✨' },
  { id:'settings',  label:'Settings',  icon:'⚙️' },
]

const ACCENT_OPTIONS = [
  { label:'Violet',   value:'#7c3aed' },
  { label:'Green',    value:'#16a34a' },
  { label:'Blue',     value:'#2563eb' },
  { label:'Rose',     value:'#e11d48' },
  { label:'Amber',    value:'#d97706' },
  { label:'Cyan',     value:'#0891b2' },
]

/* ══════════════════════════════════════════
   MASCOT
══════════════════════════════════════════ */
function KayaMascot({ size = 140, mood = 'happy', talking = false, accent = '#7c3aed' }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 160 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg2" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor={accent}/><stop offset="100%" stopColor={accent+'bb'}/></radialGradient>
        <radialGradient id="fg2" cx="50%" cy="35%" r="55%"><stop offset="0%" stopColor="#ede9fe"/><stop offset="100%" stopColor="#c4b5fd"/></radialGradient>
        <filter id="gs"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="80" cy="185" rx="40" ry="7" fill={accent} opacity="0.3"/>
      <rect x="38" y="110" width="84" height="68" rx="20" fill="url(#bg2)"/>
      <rect x="50" y="116" width="28" height="8" rx="4" fill="rgba(255,255,255,.2)"/>
      <rect x="14" y="114" width="26" height="14" rx="7" fill={accent+'aa'}/>
      <circle cx="12" cy="121" r="8" fill={accent+'cc'}/>
      <rect x="120" y="114" width="26" height="14" rx="7" fill={accent+'aa'}/>
      <circle cx="148" cy="121" r="8" fill={accent+'cc'}/>
      <rect x="52" y="170" width="22" height="18" rx="8" fill={accent+'88'}/>
      <rect x="86" y="170" width="22" height="18" rx="8" fill={accent+'88'}/>
      <rect x="77" y="16" width="6" height="28" rx="3" fill={accent+'cc'}/>
      <circle cx="80" cy="12" r="8" fill="#a78bfa" filter="url(#gs)"/>
      <circle cx="80" cy="12" r="4" fill="#ede9fe"/>
      <circle cx="80" cy="74" r="46" fill="url(#fg2)"/>
      <ellipse cx="65" cy="52" rx="12" ry="7" fill="rgba(255,255,255,.35)" transform="rotate(-20 65 52)"/>
      <circle cx="32" cy="74" r="10" fill="#c4b5fd"/><circle cx="32" cy="74" r="5" fill="#a78bfa"/>
      <circle cx="128" cy="74" r="10" fill="#c4b5fd"/><circle cx="128" cy="74" r="5" fill="#a78bfa"/>
      <g style={{transformOrigin:'58px 72px', animation:'blink 4s ease-in-out infinite'}}>
        <circle cx="58" cy="72" r="12" fill="white"/>
        <circle cx="60" cy="72" r="7" fill="#1e1b4b"/>
        <circle cx="63" cy="69" r="2.5" fill="white"/>
      </g>
      <g style={{transformOrigin:'102px 72px', animation:'blink 4s ease-in-out infinite', animationDelay:'.15s'}}>
        <circle cx="102" cy="72" r="12" fill="white"/>
        <circle cx="104" cy="72" r="7" fill="#1e1b4b"/>
        <circle cx="107" cy="69" r="2.5" fill="white"/>
      </g>
      {mood === 'happy' && <path d={talking ? "M 62 90 Q 80 102 98 90" : "M 62 88 Q 80 100 98 88"} stroke={accent} strokeWidth="3.5" strokeLinecap="round" fill="none"/>}
      {mood === 'thinking' && <path d="M 66 90 Q 78 86 94 90" stroke={accent} strokeWidth="3.5" strokeLinecap="round" fill="none"/>}
      <ellipse cx="44" cy="82" rx="8" ry="5" fill="#f9a8d4" opacity="0.45"/>
      <ellipse cx="116" cy="82" rx="8" ry="5" fill="#f9a8d4" opacity="0.45"/>
      <rect x="56" y="124" width="48" height="18" rx="9" fill="rgba(255,255,255,.15)"/>
      <text x="80" y="136.5" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" letterSpacing="1">KAYA AI</text>
    </svg>
  )
}

function MascotMini({ size = 36, talking = false, accent = '#7c3aed' }) {
  return (
    <div className="flex-shrink-0 rounded-2xl flex items-center justify-center overflow-hidden"
      style={{ width:size, height:size, background:`linear-gradient(135deg,${accent}cc,${accent})` }}>
      <svg width={size*.85} height={size*.85} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="16" r="11" fill="#ede9fe"/>
        <circle cx="13" cy="15" r="2.8" fill="#1e1b4b"/>
        <circle cx="23" cy="15" r="2.8" fill="#1e1b4b"/>
        <circle cx="14.2" cy="13.8" r=".9" fill="white"/>
        <circle cx="24.2" cy="13.8" r=".9" fill="white"/>
        <path d={talking ? "M13 20 Q18 24 23 20" : "M13 19 Q18 23 23 19"} stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  )
}

function OrbBg({ c1, c2 }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div style={{ position:'absolute', width:340, height:340, top:-80, right:-80, borderRadius:'50%', background:`radial-gradient(circle,${c1}44,transparent 70%)`, filter:'blur(50px)', animation:'orbFloat 11s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', width:260, height:260, bottom:80, left:-60, borderRadius:'50%', background:`radial-gradient(circle,${c2}33,transparent 70%)`, filter:'blur(50px)', animation:'orbFloat 14s ease-in-out infinite', animationDelay:'-4s' }}/>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════ */
export default function App() {
  const [appState, setAppState]     = useState('idle') // idle|loading|ready|error
  const [engineReady, setEngineReady] = useState(false) // engine loaded and usable
  const [loadPct, setLoadPct]       = useState(0)
  const [loadText, setLoadText]     = useState('')
  const [engineType, setEngineType] = useState(null)
  const [fromCache, setFromCache]   = useState(false)
  const [activeTab, setActiveTab]   = useState('home')
  const [catId, setCatId]           = useState('general')
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [generating, setGenerating] = useState(false)
  const [listening, setListening]   = useState(false)
  const [history, setHistory]       = useState(getHistory)
  const [stats, setStats]           = useState(getStats)
  const [settings, setSettings]     = useState(getSettings)
  const engineRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const recogRef  = useRef(null)

  const cat     = CATS.find(c => c.id === catId) || CATS[3]
  const accent  = settings.accentColor || '#7c3aed'
  const kayaName = settings.kayaName || 'Kaya'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  // If cached: show dashboard immediately, load engine in the background
  useEffect(() => {
    if (isCached()) { setFromCache(true); setAppState('ready'); loadModelBg() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshHistory = () => setHistory(getHistory())
  const refreshStats   = () => setStats(getStats())

  // First-time download: shows full loading screen
  const loadModel = useCallback(async (cached = false) => {
    setAppState('loading')
    try {
      const eng = await createEngine((pct, text, type) => {
        setLoadPct(pct); setLoadText(text)
        if (type) setEngineType(type)
      }, cached)
      engineRef.current = eng
      setEngineType(eng.type)
      setEngineReady(true)
      setAppState('ready')
    } catch { setAppState('error') }
  }, [])

  // Cache path: dashboard shows immediately, engine loads silently
  const loadModelBg = useCallback(async () => {
    try {
      const eng = await createEngine((_, __, type) => {
        if (type) setEngineType(type)
      }, true)
      engineRef.current = eng
      setEngineType(eng.type)
      setEngineReady(true)
    } catch { setEngineReady(false) }
  }, [])

  const startNewChat = (id) => {
    if (messages.length) { saveSession(catId, messages); refreshHistory() }
    setCatId(id); setMessages([]); setActiveTab('chat')
  }

  const send = useCallback(async (text) => {
    if (!text.trim() || generating || !engineReady) return
    const userMsg = { role:'user', content:text.trim() }
    setMessages(prev => [...prev, userMsg, { role:'assistant', content:'' }])
    setInput(''); setGenerating(true)
    const personality = { friendly:'Be warm and encouraging.', professional:'Be precise and formal.', concise:'Be very brief, 2-3 sentences max.' }[settings.personality] || ''
    const sysPrompt = cat.system.replace('{name}', kayaName) + ' ' + personality
    const allMsgs = [{ role:'system', content:sysPrompt }, ...messages, userMsg]
    try {
      await streamChat(engineRef.current, allMsgs, (full) => {
        setMessages(prev => { const u=[...prev]; u[u.length-1]={role:'assistant',content:full}; return u })
      })
      bumpStats(catId); refreshStats()
    } catch {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={role:'assistant',content:'⚠ Error. Please try again.'}; return u })
    } finally { setGenerating(false); inputRef.current?.focus() }
  }, [generating, appState, messages, cat, catId, settings, kayaName])

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice not supported in this browser.'); return }
    if (listening) { recogRef.current?.stop(); return }
    const r = new SR(); r.lang='en-US'; r.interimResults=true
    r.onstart = () => setListening(true)
    r.onresult = (e) => setInput(Array.from(e.results).map(x=>x[0].transcript).join(''))
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recogRef.current = r; r.start()
  }, [listening])

  if (appState === 'idle')    return <WelcomeScreen onStart={() => loadModel(false)} accent={accent} kayaName={kayaName}/>
  if (appState === 'loading') return <LoadingScreen pct={loadPct} text={loadText} engineType={engineType} accent={accent} kayaName={kayaName} fromCache={fromCache}/>
  if (appState === 'error')   return <ErrorScreen onRetry={() => loadModel(false)} accent={accent}/>

  return (
    <div className="flex flex-col h-full" style={{background:'#06090f'}}>
      {/* ── Screen ── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'home' && (
          <HomeScreen stats={stats} history={history} settings={settings} accent={accent} kayaName={kayaName} engineType={engineType}
            engineReady={engineReady} onStartChat={startNewChat} onTabChange={setActiveTab}/>
        )}
        {activeTab === 'chat' && (
          <ChatScreen cat={cat} cats={CATS} catId={catId} messages={messages} input={input} generating={generating} listening={listening}
            accent={accent} kayaName={kayaName} engineType={engineType} engineReady={engineReady}
            onSend={send} onInput={setInput} onVoice={startVoice} onSwitchCat={startNewChat}
            inputRef={inputRef} bottomRef={bottomRef}/>
        )}
        {activeTab === 'history' && (
          <HistoryScreen history={history} accent={accent} kayaName={kayaName}
            onDelete={(id) => { deleteSession(id); refreshHistory() }}
            onClear={() => { clearHistory(); refreshHistory() }}
            onResume={(s) => { setCatId(s.catId); setMessages(s.messages); setActiveTab('chat') }}/>
        )}
        {activeTab === 'customize' && (
          <CustomizeScreen settings={settings} accent={accent} kayaName={kayaName}
            onChange={(s) => { saveSettings(s); setSettings(s) }}/>
        )}
        {activeTab === 'settings' && (
          <SettingsScreen engineType={engineType} accent={accent}
            onClearAll={() => { clearHistory(); refreshHistory(); setMessages([]) }}
            onForceUpdate={() => {
              try { localStorage.removeItem('kaya_model_cache_v1') } catch {}
              setFromCache(false); setMessages([]); setAppState('idle')
            }}/>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{background:'rgba(6,9,15,.95)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,.07)', paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        <div className="flex px-2 pt-2 pb-3">
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all active:scale-90"
                style={{background: active ? `${accent}22` : 'transparent'}}>
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="text-xs font-semibold" style={{color: active ? accent : 'rgba(255,255,255,.3)'}}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/* ══════════════════════════════════════════
   HOME DASHBOARD
══════════════════════════════════════════ */
function HomeScreen({ stats, history, settings, accent, kayaName, engineType, engineReady, onStartChat, onTabChange }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = new Date().toDateString()
  const todayChats = history.filter(s => new Date(s.date).toDateString() === todayStr).length

  return (
    <div className="h-full overflow-y-auto" style={{background:'#06090f'}}>
      <OrbBg c1={accent} c2="#10b981"/>

      {/* Header */}
      <div className="relative z-10 px-5 pt-14 pb-2">
        <p className="text-sm text-white/40 mb-0.5">{greeting} 👋</p>
        <h1 className="text-2xl font-black text-white">How can <span style={{color:accent}}>{kayaName}</span> help today?</h1>
      </div>

      {/* Engine badge / waking up indicator */}
      <div className="relative z-10 px-5 mb-4">
        {engineReady ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{background:`${engineType==='webgpu'?'#34d399':'#60a5fa'}18`, color:engineType==='webgpu'?'#34d399':'#60a5fa', border:`1px solid ${engineType==='webgpu'?'#34d39944':'#60a5fa44'}`}}>
            {engineType === 'webgpu' ? '⚡ GPU mode — fast' : '🔄 WASM mode — all devices'}
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1.5"
            style={{background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.4)', border:'1px solid rgba(255,255,255,.1)'}}>
            <span style={{display:'inline-block', width:6, height:6, borderRadius:'50%', background:accent, animation:'pulse 1s ease-in-out infinite'}}/>
            Kaya is waking up…
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="relative z-10 px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Today', value: todayChats, icon:'💬' },
            { label:'Streak', value:`${stats.streak || 1}d`, icon:'🔥' },
            { label:'Total', value: stats.totalChats || 0, icon:'✅' },
          ].map(s => (
            <div key={s.label} className="rounded-3xl p-4 text-center"
              style={{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)'}}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat with Kaya CTA card */}
      <div className="relative z-10 px-5 mb-5">
        <div className="rounded-3xl p-5 relative overflow-hidden"
          style={{background:`linear-gradient(135deg,${accent}dd,${accent}88)`}}>
          <div className="absolute -right-4 -bottom-4 opacity-90">
            <KayaMascot size={100} mood="happy" accent={accent}/>
          </div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">AI Assistant</p>
          <h2 className="text-white font-black text-lg mb-3 max-w-[60%]">Talk To {kayaName}</h2>
          <button onClick={() => onStartChat('general')}
            className="bg-white rounded-2xl px-4 py-2 text-sm font-bold active:scale-95 transition-all"
            style={{color:accent}}>
            Start chatting →
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="relative z-10 px-5 mb-5">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 gap-3">
          {CATS.map(c => (
            <button key={c.id} onClick={() => onStartChat(c.id)}
              className="rounded-3xl p-4 text-left active:scale-95 transition-all"
              style={{background:`${c.color}15`, border:`1px solid ${c.color}33`}}>
              <span className="text-2xl mb-2 block">{c.emoji}</span>
              <div className="font-bold text-white text-sm">{c.label}</div>
              <div className="text-xs mt-0.5" style={{color:c.color}}>{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="relative z-10 px-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Recent</h3>
            <button onClick={() => onTabChange('history')} className="text-xs font-semibold" style={{color:accent}}>See all</button>
          </div>
          <div className="space-y-2">
            {history.slice(0,3).map(s => {
              const c = CATS.find(x=>x.id===s.catId)||CATS[3]
              return (
                <div key={s.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)'}}>
                  <span className="text-xl">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{s.preview || 'Chat session'}</p>
                    <p className="text-xs text-white/30 mt-0.5">{c.label} · {new Date(s.date).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   CHAT SCREEN
══════════════════════════════════════════ */
function ChatScreen({ cat, cats, catId, messages, input, generating, listening, accent, kayaName, engineType, engineReady,
  onSend, onInput, onVoice, onSwitchCat, inputRef, bottomRef }) {
  return (
    <div className="flex flex-col h-full relative" style={{background:'#06090f'}}>
      <OrbBg c1={cat.color} c2={cat.orb2}/>

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <div className="mascot-float"><KayaMascot size={48} mood={generating?'thinking':'happy'} talking={generating} accent={accent}/></div>
          <div>
            <p className="font-bold text-white text-base leading-tight">{cat.emoji} {cat.label}</p>
            <p className="text-xs" style={{color: !engineReady ? 'rgba(255,255,255,.35)' : cat.color}}>
              {!engineReady ? 'Waking up from cache…' : generating ? `${kayaName} is thinking…` : `${kayaName} is ready`}
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)'}}>
          {engineType === 'webgpu' ? '⚡ GPU' : '🔄 WASM'}
        </span>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 anim-fade-up">
            <div className="flex items-end gap-2">
              <MascotMini size={34} accent={accent}/>
              <div className="bubble-ai px-4 py-3 text-sm max-w-[78%]">
                Hi! I'm <span style={{color:cat.color}} className="font-semibold">{kayaName}</span> 👋 Ask me anything about {cat.label.toLowerCase()}!
              </div>
            </div>
            <div className="pl-11 flex flex-col gap-2">
              {cat.prompts.map((p,i) => (
                <button key={i} onClick={() => onSend(p)}
                  className="cat-pill text-left text-sm px-4 py-2.5 rounded-2xl"
                  style={{background:'rgba(255,255,255,.06)', border:`1px solid ${cat.color}33`, color:'rgba(255,255,255,.8)', animationDelay:`${.07*i}s`}}>
                  <span style={{color:cat.color}} className="mr-2">→</span>{p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg,i) => (
          <div key={i} className={`flex ${msg.role==='user'?'justify-end':'items-end gap-2'} msg-in`} style={{animationDelay:`${Math.min(i*20,150)}ms`}}>
            {msg.role==='assistant' && <MascotMini size={32} talking={generating&&i===messages.length-1} accent={accent}/>}
            <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${msg.role==='user'?'bubble-user':'bubble-ai'}`}
              style={msg.role==='user'?{background:`linear-gradient(135deg,${accent},${accent}cc)`}:{}}>
              {msg.content
                ? <span className="whitespace-pre-wrap">{msg.content}</span>
                : (msg.role==='assistant'&&generating&&i===messages.length-1)
                  ? <div className="flex gap-1.5 items-center py-0.5"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                  : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-1"/>
      </div>

      {/* Input + Cat switcher */}
      <div className="relative z-10 flex-shrink-0" style={{background:'rgba(6,9,15,.95)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,.07)'}}>
        {/* Category tabs */}
        <div className="flex gap-1 px-3 pt-2">
          {cats.map(c => (
            <button key={c.id} onClick={() => onSwitchCat(c.id)}
              className="flex-1 text-xs py-1.5 rounded-xl font-semibold transition-all active:scale-90"
              style={{background:catId===c.id?`${c.color}25`:'transparent', color:catId===c.id?c.color:'rgba(255,255,255,.3)'}}>
              {c.emoji} {c.label.split(' ')[0]}
            </button>
          ))}
        </div>
        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-3">
          <button onClick={onVoice}
            className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl transition-all active:scale-90"
            style={{background:listening?'rgba(239,68,68,.2)':'rgba(255,255,255,.07)', border:`1px solid ${listening?'rgba(239,68,68,.5)':accent+'44'}`, animation:listening?'micPulse 1s ease-in-out infinite':'none'}}>
            {listening ? '⏹' : '🎤'}
          </button>
          <div className="flex-1 rounded-3xl px-4 py-2.5 flex items-end gap-2"
            style={{background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', minHeight:44}}>
            <textarea ref={inputRef} rows={1} value={input}
              onChange={e => { onInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,110)+'px' }}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend(input)} }}
              placeholder={engineReady ? `Ask ${cat.label.toLowerCase()}…` : 'Kaya is waking up, please wait…'}
              disabled={generating || !engineReady}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 resize-none leading-relaxed"
              style={{maxHeight:110}}/>
          </div>
          <button onClick={() => onSend(input)} disabled={!input.trim() || generating || !engineReady}
            className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-25"
            style={{background:input.trim()&&!generating?`linear-gradient(135deg,${accent},${accent}cc)`:'rgba(255,255,255,.07)'}}>
            ↑
          </button>
        </div>
        {listening && <p className="text-center text-xs pb-2" style={{color:'#f87171'}}>🔴 Listening… tap ⏹ to stop</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   HISTORY SCREEN
══════════════════════════════════════════ */
function HistoryScreen({ history, accent, kayaName, onDelete, onClear, onResume }) {
  const [filter, setFilter] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = filter === 'all' ? history : history.filter(s => s.catId === filter)
  const grouped  = filtered.reduce((acc, s) => {
    const d = new Date(s.date).toDateString()
    ;(acc[d] = acc[d] || []).push(s)
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col" style={{background:'#06090f'}}>
      <OrbBg c1={accent} c2="#06b6d4"/>
      {/* Header */}
      <div className="relative z-10 flex-shrink-0 px-5 pt-14 pb-4">
        <h1 className="text-2xl font-black text-white mb-4">History</h1>
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
          {[{id:'all',label:'All',emoji:'🗂️'}, ...CATS].map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-2xl font-semibold transition-all active:scale-90"
              style={{background:filter===c.id?`${accent}30`:'rgba(255,255,255,.07)', color:filter===c.id?accent:'rgba(255,255,255,.5)', border:`1px solid ${filter===c.id?accent+'55':'transparent'}`}}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 space-y-5">
        {Object.keys(grouped).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4 opacity-30">🕐</div>
            <p className="text-white/40 text-sm">No conversations yet</p>
            <p className="text-white/25 text-xs mt-1">Start chatting to see history here</p>
          </div>
        )}
        {Object.entries(grouped).map(([date, sessions]) => (
          <div key={date}>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">{date}</p>
            <div className="space-y-2">
              {sessions.map(s => {
                const c = CATS.find(x=>x.id===s.catId)||CATS[3]
                return (
                  <div key={s.id} className="rounded-3xl p-4 flex items-center gap-3"
                    style={{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)'}}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{background:`${c.color}20`}}>{c.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 truncate font-medium">{s.preview || 'Chat session'}</p>
                      <p className="text-xs mt-0.5" style={{color:c.color}}>{c.label} · {s.messages?.length||0} messages</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => onResume(s)} className="text-xs px-2.5 py-1.5 rounded-xl font-semibold active:scale-90 transition-all"
                        style={{background:`${accent}25`, color:accent}}>Resume</button>
                      <button onClick={() => onDelete(s.id)} className="text-xs px-2.5 py-1.5 rounded-xl font-semibold active:scale-90 transition-all"
                        style={{background:'rgba(239,68,68,.15)', color:'#f87171'}}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="h-4"/>
      </div>

      {/* Clear all */}
      {history.length > 0 && (
        <div className="relative z-10 px-5 py-4 border-t border-white/5">
          {confirmClear
            ? <div className="flex gap-3">
                <button onClick={() => { onClear(); setConfirmClear(false) }} className="flex-1 py-3 rounded-2xl text-sm font-bold active:scale-95" style={{background:'rgba(239,68,68,.2)', color:'#f87171'}}>Yes, clear all</button>
                <button onClick={() => setConfirmClear(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold active:scale-95" style={{background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.6)'}}>Cancel</button>
              </div>
            : <button onClick={() => setConfirmClear(true)} className="w-full py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all" style={{background:'rgba(239,68,68,.1)', color:'rgba(239,68,68,.7)'}}>Clear all history</button>
          }
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   CUSTOMIZE SCREEN
══════════════════════════════════════════ */
function CustomizeScreen({ settings, accent, kayaName, onChange }) {
  const [draft, setDraft] = useState(settings)
  const update = (key, val) => { const s={...draft,[key]:val}; setDraft(s); onChange(s) }

  return (
    <div className="h-full overflow-y-auto" style={{background:'#06090f'}}>
      <OrbBg c1={draft.accentColor||accent} c2="#a78bfa"/>
      <div className="relative z-10 px-5 pt-14 pb-8 space-y-6">
        <h1 className="text-2xl font-black text-white">Customize</h1>

        {/* Live mascot preview */}
        <div className="rounded-3xl p-6 flex flex-col items-center"
          style={{background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)'}}>
          <div className="mascot-float mb-2"><KayaMascot size={110} mood="happy" accent={draft.accentColor||accent}/></div>
          <p className="font-black text-white text-lg">{draft.kayaName || 'Kaya'}</p>
          <p className="text-xs text-white/40 mt-1">Your AI assistant</p>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Assistant Name</label>
          <input value={draft.kayaName||''} onChange={e => update('kayaName', e.target.value)}
            placeholder="Kaya"
            className="w-full rounded-2xl px-4 py-3 text-white text-sm outline-none"
            style={{background:'rgba(255,255,255,.08)', border:`1px solid ${draft.accentColor||accent}44`}}/>
        </div>

        {/* Accent color */}
        <div>
          <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">Accent Color</label>
          <div className="grid grid-cols-3 gap-3">
            {ACCENT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => update('accentColor', o.value)}
                className="rounded-2xl py-3 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-90"
                style={{background:`${o.value}22`, border:`2px solid ${draft.accentColor===o.value?o.value:o.value+'33'}`, color:o.value}}>
                <span className="w-3 h-3 rounded-full" style={{background:o.value}}/>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div>
          <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">Personality Style</label>
          <div className="space-y-2">
            {[
              {id:'friendly',      label:'Friendly',      desc:'Warm, encouraging & conversational', emoji:'😊'},
              {id:'professional',  label:'Professional',  desc:'Precise, formal & structured',        emoji:'💼'},
              {id:'concise',       label:'Concise',       desc:'Brief, direct — 2-3 sentences max',   emoji:'⚡'},
            ].map(p => (
              <button key={p.id} onClick={() => update('personality', p.id)}
                className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-all active:scale-95"
                style={{background:draft.personality===p.id?`${draft.accentColor||accent}20`:'rgba(255,255,255,.05)', border:`1px solid ${draft.personality===p.id?(draft.accentColor||accent)+'55':'rgba(255,255,255,.08)'}`}}>
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <p className="font-bold text-white text-sm">{p.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{p.desc}</p>
                </div>
                {draft.personality===p.id && <span className="ml-auto text-lg" style={{color:draft.accentColor||accent}}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Default category */}
        <div>
          <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">Default Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATS.map(c => (
              <button key={c.id} onClick={() => update('defaultCat', c.id)}
                className="rounded-2xl p-3 text-left active:scale-95 transition-all"
                style={{background:draft.defaultCat===c.id?`${c.color}20`:'rgba(255,255,255,.05)', border:`1px solid ${draft.defaultCat===c.id?c.color+'55':'rgba(255,255,255,.08)'}`}}>
                <span className="text-xl block mb-1">{c.emoji}</span>
                <p className="text-sm font-bold text-white">{c.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   SETTINGS SCREEN
══════════════════════════════════════════ */
function SettingsScreen({ engineType, accent, onClearAll, onForceUpdate }) {
  const [confirmClear, setConfirmClear]   = useState(false)
  const [confirmUpdate, setConfirmUpdate] = useState(false)
  const cacheInfo = getCacheInfo()

  const Row = ({ label, value, danger, sub, onPress }) => (
    <button onClick={onPress} className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-70 transition-all text-left">
      <div>
        <span className="text-sm font-medium block" style={{color:danger?'#f87171':'rgba(255,255,255,.8)'}}>{label}</span>
        {sub && <span className="text-xs text-white/30">{sub}</span>}
      </div>
      {value && <span className="text-sm text-white/30 flex-shrink-0 ml-3">{value}</span>}
    </button>
  )
  const Section = ({ title, children }) => (
    <div className="mb-4">
      <p className="text-xs font-bold text-white/30 uppercase tracking-wider px-5 mb-2">{title}</p>
      <div className="mx-5 rounded-3xl overflow-hidden divide-y" style={{background:'rgba(255,255,255,.06)', borderColor:'rgba(255,255,255,.05)'}}>
        {children}
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto" style={{background:'#06090f'}}>
      <OrbBg c1={accent} c2="#6366f1"/>
      <div className="relative z-10 px-0 pt-14 pb-8">
        <h1 className="text-2xl font-black text-white px-5 mb-6">Settings</h1>

        <Section title="AI Engine">
          <Row label="Engine" value={engineType==='webgpu'?'⚡ WebGPU (GPU)':'🔄 WASM (CPU)'}/>
          <Row label="Model (GPU)" value="Phi-3.5 Mini"/>
          <Row label="Model (WASM)" value="Qwen2.5-0.5B"/>
          <Row label="Runs locally" value="100% on-device ✓"/>
        </Section>

        <Section title="Model Cache">
          <Row label="Status"
            value={cacheInfo ? '✅ Downloaded & cached' : '⬇️ Not downloaded yet'}
            sub={cacheInfo ? `${cacheInfo.type === 'webgpu' ? 'GPU' : 'WASM'} model · v${cacheInfo.version} · Stays on device` : 'Will download on first use'}/>
          {confirmUpdate
            ? <div className="flex gap-2 p-3">
                <button onClick={() => { onForceUpdate(); setConfirmUpdate(false) }}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold"
                  style={{background:`${accent}25`, color:accent}}>
                  Yes, re-download
                </button>
                <button onClick={() => setConfirmUpdate(false)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold"
                  style={{background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.6)'}}>
                  Cancel
                </button>
              </div>
            : <Row label="Check for updates / Re-download"
                sub="Forces a fresh model download on next start"
                onPress={() => setConfirmUpdate(true)}/>
          }
        </Section>

        <Section title="Privacy">
          <Row label="Data storage" value="Local only"/>
          <Row label="Internet required" value="First download only"/>
          <Row label="Cloud sync" value="None — private"/>
        </Section>

        <Section title="App Info">
          <Row label="Version" value="1.0.0"/>
          <Row label="Model version" value={`v${MODEL_VERSION}`}/>
          <Row label="Hackathon" value="AppBuildersPH 2026"/>
          <Row label="Built with" value="Claude Code"/>
        </Section>

        <Section title="Data">
          {confirmClear
            ? <div className="flex gap-2 p-3">
                <button onClick={() => { onClearAll(); setConfirmClear(false) }} className="flex-1 py-2.5 rounded-2xl text-sm font-bold" style={{background:'rgba(239,68,68,.2)', color:'#f87171'}}>Yes, clear everything</button>
                <button onClick={() => setConfirmClear(false)} className="flex-1 py-2.5 rounded-2xl text-sm font-bold" style={{background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.6)'}}>Cancel</button>
              </div>
            : <Row label="Clear all chat history" danger onPress={() => setConfirmClear(true)}/>
          }
        </Section>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   WELCOME / LOADING / ERROR
══════════════════════════════════════════ */
function WelcomeScreen({ onStart, accent, kayaName }) {
  return (
    <div className="flex flex-col min-h-full relative overflow-hidden" style={{background:'#06090f'}}>
      <div style={{position:'absolute',width:400,height:400,top:-100,right:-80,borderRadius:'50%',background:`radial-gradient(circle,${accent}44,transparent 70%)`,filter:'blur(50px)',animation:'orbFloat 12s ease-in-out infinite'}}/>
      <div style={{position:'absolute',width:300,height:300,bottom:100,left:-80,borderRadius:'50%',background:'radial-gradient(circle,#4f46e544,transparent 70%)',filter:'blur(50px)',animation:'orbFloat 9s ease-in-out infinite',animationDelay:'-3s'}}/>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-16 pb-6">
        <div className="anim-fade-in" style={{animationDelay:'.05s'}}>
          <span className="text-xs font-bold tracking-widest uppercase" style={{color:accent}}>AppBuildersPH · Local AI 2026</span>
        </div>
        <div className="flex justify-center my-6 mascot-float anim-fade-up" style={{animationDelay:'.1s'}}>
          <KayaMascot size={148} mood="happy" accent={accent}/>
        </div>
        <div className="text-center mb-6 anim-fade-up" style={{animationDelay:'.18s'}}>
          <h1 className="text-4xl font-black text-white mb-2">Meet <span style={{color:accent}}>{kayaName}</span></h1>
          <p className="text-white/50 text-base">Your everyday AI — runs 100% on your device.<br/>Private. Offline. Always with you.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-6 anim-fade-up" style={{animationDelay:'.24s'}}>
          {['🍳 Cooking','🔧 Repairs','🚌 Commute','💡 Daily Life'].map(f=>(
            <span key={f} className="rounded-2xl px-3 py-1.5 text-sm text-white/70 font-medium" style={{background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)'}}>{f}</span>
          ))}
        </div>
        <div className="flex gap-3 justify-center text-xs text-white/30 mb-4 anim-fade-up" style={{animationDelay:'.3s'}}>
          <span>🔒 100% private</span><span>·</span><span>✈️ Works offline</span><span>·</span><span>📱 iOS & Android</span>
        </div>
      </div>
      <div className="relative z-10 px-6 pb-12 anim-slide-up" style={{animationDelay:'.35s'}}>
        <button onClick={onStart} className="w-full py-4 rounded-3xl font-bold text-base text-white transition-all active:scale-95"
          style={{background:`linear-gradient(135deg,${accent},${accent}cc)`, boxShadow:`0 8px 32px ${accent}55`}}>
          Start chatting with {kayaName} →
        </button>
        <p className="text-center text-xs text-white/25 mt-3">Auto-selects GPU or WASM · ~500MB first download</p>
      </div>
    </div>
  )
}

function LoadingScreen({ pct, text, engineType, accent, kayaName, fromCache }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center relative overflow-hidden" style={{background:'#06090f'}}>
      <div style={{position:'absolute',width:350,height:350,top:-50,left:'50%',transform:'translateX(-50%)',borderRadius:'50%',background:`radial-gradient(circle,${accent}33,transparent 70%)`,filter:'blur(50px)'}}/>
      <div className="relative z-10 mascot-float mb-6"><KayaMascot size={120} mood="thinking" accent={accent}/></div>
      <h2 className="text-xl font-bold text-white mb-1 relative z-10">
        {fromCache ? `Welcome back!` : `Waking up ${kayaName}…`}
      </h2>
      {engineType && (
        <span className="text-xs px-3 py-1 rounded-full mb-4 font-semibold relative z-10"
          style={{background:'rgba(255,255,255,.07)', color:engineType==='webgpu'?'#34d399':'#60a5fa'}}>
          {engineType==='webgpu'?'⚡ GPU mode — fast':'🔄 WASM mode — all devices'}
        </span>
      )}
      <p className="text-sm text-white/40 mb-8 max-w-xs leading-relaxed relative z-10">
        {fromCache ? 'Loading your AI from device cache…' : (text || 'Initializing…')}
      </p>

      {fromCache ? (
        /* Cached: simple animated bar that pulses to signal activity */
        <div className="w-full max-w-xs relative z-10">
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,.08)'}}>
            <div style={{height:'100%', borderRadius:'inherit', background:`linear-gradient(90deg,transparent,${accent},transparent)`, backgroundSize:'200% 100%', animation:'shimmer 1.4s linear infinite'}}/>
          </div>
          <p className="text-xs text-white/30 mt-3">No download needed · Using cached model</p>
        </div>
      ) : (
        /* First download: full progress bar + % */
        <div className="w-full max-w-xs relative z-10">
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{background:'rgba(255,255,255,.08)'}}>
            <div className="progress-bar h-full rounded-full" style={{width:`${pct}%`, background:`linear-gradient(90deg,${accent},${accent}aa)`, boxShadow:`0 0 12px ${accent}88`}}/>
          </div>
          <p className="font-black text-2xl" style={{color:accent}}>{pct}%</p>
          <p className="text-xs text-white/20 mt-3">{text || ''}</p>
          <p className="text-xs text-white/15 mt-1">~500 MB · Cached forever after this · Never sent anywhere</p>
        </div>
      )}
    </div>
  )
}

function ErrorScreen({ onRetry, accent }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center" style={{background:'#06090f'}}>
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-xl font-bold text-white mb-2">Couldn't wake up</h2>
      <p className="text-white/40 text-sm mb-6 max-w-xs">The model download may have failed. You need internet for the first download, then it works offline.</p>
      <button onClick={onRetry} className="px-8 py-3 rounded-2xl font-bold text-white active:scale-95 transition-all"
        style={{background:`linear-gradient(135deg,${accent},${accent}cc)`}}>Try Again</button>
    </div>
  )
}
