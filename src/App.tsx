import { useRef, useState } from 'react'
import TopNav from './components/TopNav'
import Home from './components/Home'
import Thinking from './components/Thinking'
import Asset from './components/Asset'
import Watchlist from './components/Watchlist'
import Portfolio from './components/Portfolio'
import ResearchHome from './components/ResearchHome'
import Advanced from './components/Advanced'
import { research } from './research'
import { ApiError, type ErrorKind } from './api/finnhub'
import type { Analysis } from './analysis'
import { loadHistory, pushHistory, type HistoryRow } from './store'
import { fetchRun, type RunResult } from './api/research'

export type Screen = 'home' | 'thinking' | 'asset' | 'watchlist' | 'portfolio' | 'research'
export type SubTab = 'overview' | 'why' | 'risks' | 'research'

export interface Settings {
  showExpectedReturn: boolean
  answerDepth: 'short' | 'full'
}

export interface AskError {
  kind: ErrorKind
  message: string
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [sub, setSub] = useState<SubTab>('overview')
  const [q, setQ] = useState('')
  const [askedQ, setAskedQ] = useState('')
  const [thinkStep, setThinkStep] = useState(0)
  const [advanced, setAdvanced] = useState(false)
  const [settings, setSettings] = useState<Settings>({ showExpectedReturn: true, answerDepth: 'short' })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<AskError | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>(loadHistory)
  const [keyVersion, setKeyVersion] = useState(0)
  const [run, setRun] = useState<RunResult | null>(null)
  const [runLoading, setRunLoading] = useState(false)
  const runId = useRef(0)

  const ask = async (preset?: string) => {
    const asked = (preset ?? q).trim() || 'Should I buy ZETA for the next 3 months?'
    const id = ++runId.current
    setAskedQ(asked)
    setThinkStep(0)
    setSub('overview')
    setError(null)
    setAdvanced(false)
    setRun(null)
    setScreen('thinking')
    try {
      const a = await research(asked, step => { if (runId.current === id) setThinkStep(step) })
      if (runId.current !== id) return
      setAnalysis(a)
      setRunLoading(true)
      fetchRun(a.sym).then(r => { if (runId.current === id) { setRun(r); setRunLoading(false) } })
      setHistory(pushHistory({ q: asked, sym: a.sym, view: a.stance, color: a.color, at: Date.now() }))
    } catch (e) {
      if (runId.current !== id) return
      setAnalysis(null)
      setError(e instanceof ApiError ? { kind: e.kind, message: e.message } : { kind: 'network', message: 'Something went wrong while researching. Try again.' })
    }
    setScreen('asset')
  }

  const go = (s: Screen) => {
    runId.current += 1
    setAdvanced(false)
    setScreen(s)
  }

  const openAsset = (sym: string) => ask(`What does SIGNAL think of ${sym}?`)
  const keyChanged = () => setKeyVersion(v => v + 1)

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f6f5f2', color: '#16181c', display: 'flex', flexDirection: 'column' }}>
      <TopNav screen={screen} go={go} settings={settings} onSettings={p => setSettings(s => ({ ...s, ...p }))} keyVersion={keyVersion} onKeyChange={keyChanged} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'home' && <Home q={q} onQ={setQ} ask={ask} history={history} />}
        {screen === 'thinking' && <Thinking askedQ={askedQ} step={thinkStep} />}
        {screen === 'asset' && (
          <Asset a={analysis} run={run} runLoading={runLoading} error={error} askedQ={askedQ} retry={() => { keyChanged(); ask(askedQ) }} sub={sub} setSub={setSub} settings={settings} openAdvanced={() => setAdvanced(true)} />
        )}
        {screen === 'watchlist' && <Watchlist openAsset={openAsset} keyVersion={keyVersion} onKeyChange={keyChanged} />}
        {screen === 'portfolio' && <Portfolio openAsset={openAsset} keyVersion={keyVersion} onKeyChange={keyChanged} />}
        {screen === 'research' && <ResearchHome history={history} openQuestion={ask} openAdvanced={() => setAdvanced(true)} />}
        {advanced && <Advanced close={() => setAdvanced(false)} />}
      </div>
    </div>
  )
}
