import { font, card, btnPrimary, MUTED, FAINT, FAINTER, viewPill } from '../theme'
import { whenLabel, type HistoryRow } from '../store'

interface Props {
  history: HistoryRow[]
  openQuestion: (q: string) => void
  openAdvanced: () => void
}

export default function ResearchHome({ history, openQuestion, openAdvanced }: Props) {
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
        <div style={{ ...font(400, 22, 1.25), letterSpacing: '-.01em' }}>Advanced Research</div>
        <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 12, textWrap: 'pretty' }}>
          The full professional terminal: research agents, evidence graph, prediction model and calibration, historical analogies, investment committee and system architecture. Off by default.
        </div>
        <div style={{ ...font(400, 13, 1.55), color: FAINTER, marginTop: 12 }}>
          This is the design prototype with illustrative numbers. The research agents behind it are not public yet.
        </div>
        <button onClick={openAdvanced} style={btnPrimary}>Open Advanced Research</button>
      </div>
    </div>
  )
}
