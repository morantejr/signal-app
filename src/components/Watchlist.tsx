import { useEffect, useRef, useState } from 'react'
import { font, MUTED, FAINT, FAINTER, INK, viewPill } from '../theme'
import { snapshot } from '../research'
import { ApiError, hasKey } from '../api/finnhub'
import type { Analysis } from '../analysis'
import { loadWatchlist, saveWatchlist } from '../store'
import { fmtPrice } from '../format'
import KeyPrompt from './KeyPrompt'
import { fetchRunIndex, bandLabel, leanLabel, type RunIndexEntry } from '../api/research'

type Row = Analysis | { error: string }

interface Props {
  openAsset: (sym: string) => void
  keyVersion: number
  onKeyChange: () => void
}

export default function Watchlist({ openAsset, keyVersion, onKeyChange }: Props) {
  const [syms, setSyms] = useState<string[]>(loadWatchlist)
  const [rows, setRows] = useState<Record<string, Row | undefined>>({})
  const [input, setInput] = useState('')
  const [runs, setRuns] = useState<Record<string, RunIndexEntry>>({})
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const connected = hasKey()

  useEffect(() => { fetchRunIndex().then(setRuns) }, [])

  useEffect(() => {
    if (!hasKey()) return
    let live = true
    syms.filter(s => !rowsRef.current[s]).forEach(sym => {
      snapshot(sym)
        .then(a => { if (live) setRows(r => ({ ...r, [sym]: a })) })
        .catch((e: unknown) => { if (live) setRows(r => ({ ...r, [sym]: { error: e instanceof ApiError ? e.message : 'Unavailable right now.' } })) })
    })
    return () => { live = false }
  }, [syms, keyVersion])

  const add = () => {
    const s = input.trim().toUpperCase()
    if (s && !syms.includes(s)) {
      const n = [...syms, s]
      setSyms(n)
      saveWatchlist(n)
    }
    setInput('')
  }
  const remove = (sym: string) => {
    const n = syms.filter(s => s !== sym)
    setSyms(n)
    saveWatchlist(n)
  }

  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .35s ease both' }}>
      <div style={{ ...font(400, 32, 1.15), letterSpacing: '-.02em' }}>Watchlist</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10 }}>
        SIGNAL re-reads these every time you open this screen and tells you what it thinks now.
      </div>
      {!connected && <KeyPrompt onSaved={onKeyChange} />}
      {syms.map(sym => {
        const r = rows[sym]
        const a = r && !('error' in r) ? r : null
        return (
          <div key={sym} className="hoverFade" onClick={() => a && openAsset(sym)} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 2px', borderBottom: '1px solid #e9e6e0', cursor: a ? 'pointer' : 'default' }}>
            <div style={{ width: 74 }}>
              <div style={font(400, 18)}>{sym}</div>
              <div style={{ ...font(400, 13), color: FAINT, marginTop: 7 }}>{a ? fmtPrice(a.price) : ''}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {a ? (
                <>
                  <div style={viewPill(a.color)}>{a.stance}</div>
                  <div style={{ ...font(400, 14, 1.45), color: MUTED, marginTop: 5 }}>{a.headline}</div>
                  {runs[sym] && (
                    <div style={{ ...font(400, 13, 1.4), color: FAINTER, marginTop: 5 }}>
                      Full research: quant {bandLabel(runs[sym].quant_band).toLowerCase()}{runs[sym].quant_score != null ? ` (${runs[sym].quant_score})` : ''} · narrative {leanLabel(runs[sym].narrative_lean).toLowerCase()} · {runs[sym].agree ? 'agree' : 'disagree'}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ ...font(400, 14, 1.45), color: FAINTER }}>{r && 'error' in r ? r.error : connected ? 'Reading…' : 'Waiting for a data key'}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', width: 96 }}>
              {a && (
                <>
                  <div style={font(400, 16)}>{a.confidence}%</div>
                  <div style={{ ...font(400, 12), color: FAINTER, marginTop: 7 }}>confidence</div>
                </>
              )}
            </div>
            <span onClick={e => { e.stopPropagation(); remove(sym) }} title="Remove" style={{ ...font(400, 16), color: FAINTER, cursor: 'pointer', padding: '0 4px' }}>×</span>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Add a ticker, like AMZN"
          style={{ flex: 1, minWidth: 0, border: '1px solid #e2ded6', borderRadius: 9, padding: '11px 14px', ...font(400, 15), color: INK, outline: 0, background: '#fff' }}
        />
        <button onClick={add} style={{ background: INK, color: '#fff', border: 0, ...font(400, 15), padding: '11px 18px', borderRadius: 9, cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}
