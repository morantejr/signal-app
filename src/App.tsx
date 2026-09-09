import { useEffect, useRef, useState } from 'react'
import TopNav from './components/TopNav'
import Home from './components/Home'
import Thinking from './components/Thinking'
import Asset from './components/Asset'
import Watchlist from './components/Watchlist'
import Portfolio from './components/Portfolio'
import ResearchHome from './components/ResearchHome'
import Advanced from './components/Advanced'

export type Screen = 'home' | 'thinking' | 'asset' | 'watchlist' | 'portfolio' | 'research'
export type SubTab = 'overview' | 'why' | 'risks' | 'research'

export interface Settings {
  showExpectedReturn: boolean
  answerDepth: 'short' | 'full'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [sub, setSub] = useState<SubTab>('overview')
  const [q, setQ] = useState('')
  const [askedQ, setAskedQ] = useState('')
  const [thinkStep, setThinkStep] = useState(0)
  const [advanced, setAdvanced] = useState(false)
  const [settings, setSettings] = useState<Settings>({ showExpectedReturn: true, answerDepth: 'short' })
  const timer = useRef<number | undefined>(undefined)

  const ask = (preset?: string) => {
    const asked = (preset ?? q).trim() || 'Should I buy ZETA for the next 3 months?'
    setAskedQ(asked)
    setThinkStep(0)
    setSub('overview')
    setScreen('thinking')
    if (timer.current) clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setThinkStep(s => {
        if (s >= 3) {
          clearInterval(timer.current)
          setScreen('asset')
          return s
        }
        return s + 1
      })
    }, 520)
  }

  useEffect(() => () => clearInterval(timer.current), [])

  const go = (s: Screen) => {
    setAdvanced(false)
    setScreen(s)
  }

  const openAsset = () => {
    setSub('overview')
    setScreen('asset')
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f6f5f2', color: '#16181c', display: 'flex', flexDirection: 'column' }}>
      <TopNav screen={screen} go={go} settings={settings} onSettings={p => setSettings(s => ({ ...s, ...p }))} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'home' && <Home q={q} onQ={setQ} ask={ask} />}
        {screen === 'thinking' && <Thinking askedQ={askedQ} step={thinkStep} />}
        {screen === 'asset' && <Asset sub={sub} setSub={setSub} settings={settings} openAdvanced={() => setAdvanced(true)} />}
        {screen === 'watchlist' && <Watchlist openAsset={openAsset} />}
        {screen === 'portfolio' && <Portfolio openAsset={openAsset} />}
        {screen === 'research' && <ResearchHome openAsset={openAsset} openAdvanced={() => setAdvanced(true)} />}
        {advanced && <Advanced close={() => setAdvanced(false)} />}
      </div>
    </div>
  )
}
