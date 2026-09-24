import { useEffect, useRef, useState } from 'react'
import { font, card, GREEN, RED, AMBER, INK, MUTED, FAINT, FAINTER, viewPill } from '../theme'
import { snapshot } from '../research'
import { ApiError, hasKey } from '../api/finnhub'
import type { Analysis } from '../analysis'
import { loadHoldings, saveHoldings, type Holding } from '../store'
import { fmtPct } from '../format'
import KeyPrompt from './KeyPrompt'

type Row = Analysis | { error: string }

interface Props {
  openAsset: (sym: string) => void
  keyVersion: number
  onKeyChange: () => void
}

export default function Portfolio({ openAsset, keyVersion, onKeyChange }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings)
  const [rows, setRows] = useState<Record<string, Row | undefined>>({})
  const [sym, setSym] = useState('')
  const [w, setW] = useState('')
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const connected = hasKey()

  useEffect(() => {
    if (!hasKey()) return
    let live = true
    holdings.filter(h => !rowsRef.current[h.sym]).forEach(h => {
      snapshot(h.sym)
        .then(a => { if (live) setRows(r => ({ ...r, [h.sym]: a })) })
        .catch((e: unknown) => { if (live) setRows(r => ({ ...r, [h.sym]: { error: e instanceof ApiError ? e.message : 'Unavailable right now.' } })) })
    })
    return () => { live = false }
  }, [holdings, keyVersion])

  const add = () => {
    const s = sym.trim().toUpperCase()
    const weight = Number(w)
    if (!s || !Number.isFinite(weight) || weight <= 0) return
    const n = [...holdings.filter(h => h.sym !== s), { sym: s, w: weight }]
    setHoldings(n)
    saveHoldings(n)
    setSym('')
    setW('')
  }
  const remove = (s: string) => {
    const n = holdings.filter(h => h.sym !== s)
    setHoldings(n)
    saveHoldings(n)
  }

  const total = holdings.reduce((a, h) => a + h.w, 0)
  const loaded = holdings.map(h => ({ h, a: rows[h.sym] })).filter((x): x is { h: Holding; a: Analysis } => !!x.a && !('error' in x.a))
  const erRows = loaded.filter(x => x.a.er != null)
  const erW = erRows.reduce((a, x) => a + x.h.w, 0)
  const er = erW ? erRows.reduce((a, x) => a + x.h.w * (x.a.er as number), 0) / erW : null
  const betaRows = loaded.filter(x => x.a.beta != null)
  const betaW = betaRows.reduce((a, x) => a + x.h.w, 0)
  const beta = betaW ? betaRows.reduce((a, x) => a + x.h.w * (x.a.beta as number), 0) / betaW : null
  const bumpy = beta == null ? '—' : beta < 0.8 ? 'Calm' : beta < 1.2 ? 'Normal' : 'Bumpy'

  const byIndustry = new Map<string, { w: number; n: number }>()
  loaded.forEach(x => {
    const k = x.a.industry || 'Other'
    const cur = byIndustry.get(k) ?? { w: 0, n: 0 }
    byIndustry.set(k, { w: cur.w + x.h.w, n: cur.n + 1 })
  })
  const top = [...byIndustry.entries()].sort((a, b) => b[1].w - a[1].w)[0]
  const loadedW = loaded.reduce((a, x) => a + x.h.w, 0)
  const topPct = top && loadedW ? Math.round((top[1].w / loadedW) * 100) : 0

  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .35s ease both' }}>
      <div style={{ ...font(400, 32, 1.15), letterSpacing: '-.02em' }}>Portfolio</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10 }}>
        Tell SIGNAL what you own and roughly how much of the portfolio each holding is. It stays in this browser.
      </div>
      {!connected && <KeyPrompt onSaved={onKeyChange} />}
      {holdings.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, marginTop: 24 }}>
          <div>
            <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Holdings</div>
            <div style={font(400, 28)}>{holdings.length}</div>
          </div>
          <div>
            <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Expected over 3 months</div>
            <div style={{ ...font(400, 28), color: er == null ? FAINTER : er > 0 ? GREEN : er < 0 ? RED : AMBER }}>{er == null ? '—' : fmtPct(er, 1)}</div>
          </div>
          <div>
            <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Ups and downs</div>
            <div style={font(400, 28)}>{bumpy}</div>
          </div>
        </div>
      )}
      {top && loaded.length > 1 && (
        <div style={{ ...card, padding: '28px 30px', marginTop: 26 }}>
          <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 12 }}>ONE THING TO KNOW</div>
          <div style={{ ...font(400, 20, 1.45), color: INK, textWrap: 'pretty' }}>
            {top[1].n} of your {loaded.length} holdings, {topPct}% of the portfolio, {top[1].n === 1 ? 'is' : 'are'} in {top[0]}.
          </div>
          <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 14, textWrap: 'pretty' }}>
            {topPct >= 50 && top[1].n > 1
              ? 'They look like separate bets, but they will tend to rise and fall together when that industry moves.'
              : 'The portfolio is spread across different industries, so no single theme dominates.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
            <div style={{ flex: 1, height: 8, background: '#f0ede7', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${topPct}%`, height: '100%', background: topPct >= 50 ? AMBER : GREEN, transformOrigin: 'left', animation: 'sGrow .7s ease both' }} />
            </div>
            <span style={{ ...font(400, 15), color: topPct >= 50 ? AMBER : GREEN }}>{topPct}% linked</span>
          </div>
        </div>
      )}
      {holdings.map(h => {
        const r = rows[h.sym]
        const a = r && !('error' in r) ? r : null
        return (
          <div key={h.sym} className="hoverFade" onClick={() => a && openAsset(h.sym)} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 2px', borderBottom: '1px solid #e9e6e0', cursor: a ? 'pointer' : 'default' }}>
            <span style={{ width: 74, ...font(400, 17) }}>{h.sym}</span>
            <span style={{ width: 64, ...font(400, 15), color: MUTED }}>{total ? Math.round((h.w / total) * 100) : 0}%</span>
            <span style={{ flex: 1, minWidth: 0, ...font(400, 15, 1.4), color: MUTED }}>{a ? a.industry || a.name : r && 'error' in r ? r.error : connected ? 'Reading…' : ''}</span>
            {a && <span style={viewPill(a.color)}>{a.stance}</span>}
            <span onClick={e => { e.stopPropagation(); remove(h.sym) }} title="Remove" style={{ ...font(400, 16), color: FAINTER, cursor: 'pointer', padding: '0 4px' }}>×</span>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <input value={sym} onChange={e => setSym(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="Ticker" style={{ flex: 2, minWidth: 120, border: '1px solid #e2ded6', borderRadius: 9, padding: '11px 14px', ...font(400, 15), color: INK, outline: 0, background: '#fff' }} />
        <input value={w} onChange={e => setW(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="Weight, e.g. 25" inputMode="decimal" style={{ flex: 1, minWidth: 110, border: '1px solid #e2ded6', borderRadius: 9, padding: '11px 14px', ...font(400, 15), color: INK, outline: 0, background: '#fff' }} />
        <button onClick={add} style={{ background: INK, color: '#fff', border: 0, ...font(400, 15), padding: '11px 18px', borderRadius: 9, cursor: 'pointer' }}>Add</button>
      </div>
      {holdings.length === 0 && (
        <div style={{ ...font(400, 14, 1.6), color: FAINTER, marginTop: 16 }}>Nothing here yet. Add a ticker and a rough weight to see how your holdings hang together.</div>
      )}
    </div>
  )
}
