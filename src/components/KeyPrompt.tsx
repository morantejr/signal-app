import { useState } from 'react'
import { font, card, btnPrimary, INK, MUTED, FAINT } from '../theme'
import { getKey, setKey } from '../api/finnhub'

interface Props {
  onSaved: () => void
  compact?: boolean
}

export default function KeyPrompt({ onSaved, compact }: Props) {
  const [v, setV] = useState(getKey())
  const save = () => {
    setKey(v)
    onSaved()
  }
  const field = (
    <div style={{ display: 'flex', gap: 10, marginTop: compact ? 10 : 22 }}>
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save() }}
        placeholder="Paste your Finnhub key"
        style={{ flex: 1, minWidth: 0, border: '1px solid #e2ded6', borderRadius: 9, padding: '11px 14px', ...font(400, 15), color: INK, outline: 0, background: '#fff' }}
      />
      <button onClick={save} style={{ ...btnPrimary, marginTop: 0, padding: '11px 18px' }}>Save</button>
    </div>
  )
  if (compact) {
    return (
      <div>
        <div style={{ ...font(400, 13, 1.5), color: MUTED }}>
          Free key from <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">finnhub.io</a>. It stays in this browser.
        </div>
        {field}
      </div>
    )
  }
  return (
    <div style={{ ...card, padding: 32, marginTop: 20 }}>
      <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT }}>CONNECT MARKET DATA</div>
      <div style={{ ...font(400, 26, 1.25), letterSpacing: '-.01em', marginTop: 14 }}>SIGNAL reads live data. It needs a free key.</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 14, textWrap: 'pretty' }}>
        Prices, fundamentals, analyst ratings, results and news come from Finnhub. Create a free account at{' '}
        <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">finnhub.io/register</a>, copy the API key from the dashboard and paste it here. The key is kept in this browser and only ever sent to Finnhub.
      </div>
      {field}
    </div>
  )
}
