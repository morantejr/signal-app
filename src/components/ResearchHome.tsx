import { useEffect, useState } from 'react'
import { font, card, MUTED, FAINT, FAINTER, GREEN, RED, AMBER, viewPill } from '../theme'
import { whenLabel, type HistoryRow } from '../store'
import { fetchRunIndex, bandLabel, leanLabel, type RunIndexEntry } from '../api/research'

interface Props {
  history: HistoryRow[]
  openQuestion: (q: string) => void
  openAdvanced: () => void
}

const bandColor = (b: string) => (b === 'attractive' ? GREEN : b === 'expensive' ? RED : b === 'fair' ? AMBER : FAINT)

export default function ResearchHome({ history, openQuestion, openAdvanced }: Props) {
  const [runs, setRuns] = useState<RunIndexEntry[]>([])
  useEffect(() => { fetchRunIndex().then(r => setRuns(Object.values(r).sort((a, b) => a.ticker.localeCompare(b.ticker)))) }, [])
  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .35s ease both' }}>
      <div style={{ ...font(400, 32, 1.15), letterSpacing: '-.02em' }}>Research</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10 }}>
        Everything you've asked, and the answer SIGNAL gave.
      </div>
      {history.length === 0 && (
        <div style={{ ...font(400, 15, 1.6), color: FAINTER, marginTop: 24 }}>Nothing yet. Ask a question on the Home screen and it will show up here.</div>
      )}
      {history.map(h => (
        <div key={h.q} className="hoverFade" onClick={() => openQuestion(h.q)} style={{ padding: '20px 2px', borderBottom: '1px solid #e9e6e0', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={font(400, 17, 1.4)}>{h.q}</span>
            <span style={viewPill(h.color)}>{h.view}</span>
          </div>
          <div style={{ ...font(400, 14, 1.5), color: FAINT, marginTop: 6 }}>{h.sym} · {whenLabel(h.at)}</div>
        </div>
      ))}
      <div style={{ ...card, padding: '28px 30px', marginTop: 30 }}>
        <div style={{ ...font(400, 22, 1.25), letterSpacing: '-.01em' }}>Full research</div>
        <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 12, textWrap: 'pretty' }}>
          Companies the research system has covered: evidence from filings and market data, a quant score computed in code, bull and bear memos, and a synthesis that shows where they disagree. Refreshed each weekday evening.
        </div>
        {runs.length === 0 && <div style={{ ...font(400, 14, 1.5), color: FAINTER, marginTop: 14 }}>No runs published yet.</div>}
        {runs.map(r => (
          <div key={r.ticker} className="hoverFade" onClick={() => openQuestion(`What does SIGNAL think of ${r.ticker}?`)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: '1px solid #efece6', cursor: 'pointer' }}>
            <span style={{ ...font(400, 16), width: 64 }}>{r.ticker}</span>
            <span style={{ ...font(400, 14), color: bandColor(r.quant_band), width: 130 }}>{bandLabel(r.quant_band)}{r.quant_score != null ? ` (${r.quant_score})` : ''}</span>
            <span style={{ ...font(400, 14), color: MUTED, flex: 1 }}>narrative {leanLabel(r.narrative_lean).toLowerCase()}</span>
            <span style={{ ...font(400, 13), color: r.agree ? FAINTER : AMBER, whiteSpace: 'nowrap' }}>{r.agree ? 'agree' : 'disagree'}</span>
          </div>
        ))}
      </div>
      <div style={{ ...font(400, 13, 1.6), color: FAINTER, marginTop: 18, textWrap: 'pretty' }}>
        There is also a <a href="#" onClick={e => { e.preventDefault(); openAdvanced() }}>design prototype of the professional terminal</a>: evidence graph, committee, calibration and so on, with illustrative numbers only. It is not connected to the research system.
      </div>
    </div>
  )
}
