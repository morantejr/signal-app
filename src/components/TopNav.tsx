import { useState } from 'react'
import { font, INK, FAINT, GREEN, AMBER, MUTED } from '../theme'
import { hasKey } from '../api/finnhub'
import KeyPrompt from './KeyPrompt'
import type { Screen, Settings } from '../App'

const TABS: Array<[Screen, string]> = [
  ['home', 'Home'],
  ['watchlist', 'Watchlist'],
  ['portfolio', 'Portfolio'],
  ['research', 'Research'],
]

interface Props {
  screen: Screen
  go: (screen: Screen) => void
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  keyVersion: number
  onKeyChange: () => void
}

export default function TopNav({ screen, go, settings, onSettings, keyVersion, onKeyChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const connected = hasKey()
  void keyVersion

  const navStyle = (on: boolean): React.CSSProperties => ({
    ...font(400, 15),
    color: on ? INK : FAINT,
    cursor: 'pointer',
    padding: '4px 0',
    boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none',
  })

  const isOn = (k: Screen) => screen === k || (k === 'home' && (screen === 'asset' || screen === 'thinking'))

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(246,245,242,.86)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #e9e6e0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 28 }}>
        <span onClick={() => go('home')} style={{ ...font(500, 17), letterSpacing: '.16em', cursor: 'pointer' }}>SIGNAL</span>
        <div style={{ flex: 1, display: 'flex', gap: 22 }}>
          {TABS.map(([k, label]) => (
            <span key={k} className="hoverInk" onClick={() => go(k)} style={navStyle(isOn(k))}>{label}</span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setMenuOpen(o => !o)}
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#e5e1d9', border: '1px solid #dbd6cc', display: 'flex', alignItems: 'center', justifyContent: 'center', ...font(500, 11), color: '#6b6f76', cursor: 'pointer', position: 'relative' }}
          >
            JR
            <span style={{ position: 'absolute', right: -2, bottom: -2, width: 9, height: 9, borderRadius: '50%', background: connected ? GREEN : AMBER, border: '2px solid #f6f5f2' }} />
          </div>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 40, width: 300, background: '#fff', border: '1px solid #e6e2da', borderRadius: 12, boxShadow: '0 8px 24px rgba(20,22,26,.08)', padding: '8px 0', animation: 'sFade .15s ease both' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px', cursor: 'pointer' }}>
                <span style={font(400, 14, 1.3)}>Show expected return</span>
                <input
                  type="checkbox"
                  checked={settings.showExpectedReturn}
                  onChange={e => onSettings({ showExpectedReturn: e.target.checked })}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px', cursor: 'pointer' }}>
                <span style={font(400, 14, 1.3)}>Answer depth</span>
                <select
                  value={settings.answerDepth}
                  onChange={e => onSettings({ answerDepth: e.target.value as Settings['answerDepth'] })}
                  style={{ ...font(400, 13), padding: '4px 6px' }}
                >
                  <option value="short">short</option>
                  <option value="full">full</option>
                </select>
              </label>
              <div style={{ padding: '12px 16px 14px', borderTop: '1px solid #efece6', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={font(400, 14, 1.3)}>Market data</span>
                  <span style={{ ...font(400, 12), color: connected ? GREEN : MUTED }}>{connected ? 'Connected' : 'Not connected'}</span>
                </div>
                <KeyPrompt compact onSaved={onKeyChange} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
