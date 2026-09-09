import { font, INK, FAINT, viewPill } from '../theme'
import { recents } from '../data'

interface Props {
  q: string
  onQ: (q: string) => void
  ask: (q?: string) => void
}

export default function Home({ q, onQ, ask }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 24px 120px', animation: 'sIn .4s ease both' }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ ...font(400, 40, 1.15), letterSpacing: '-.02em', marginBottom: 28 }}>Ask SIGNAL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #e2ded6', borderRadius: 14, padding: '0 20px', height: 62, boxShadow: '0 1px 2px rgba(20,22,26,.04)' }}>
          <input
            value={q}
            onChange={e => onQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask() }}
            placeholder="Should I buy NVDA?"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', ...font(400, 19), color: INK }}
          />
          <button onClick={() => ask()} style={{ background: INK, color: '#fff', border: 0, ...font(400, 16), padding: '13px 20px', borderRadius: 9, cursor: 'pointer' }}>
            Ask
          </button>
        </div>
        <div style={{ marginTop: 34 }}>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 10 }}>Recent</div>
          {recents.map(r => (
            <div key={r.label} className="hoverFadeLight" onClick={() => ask(r.label)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 2px', borderBottom: '1px solid #e9e6e0', cursor: 'pointer' }}>
              <span style={{ ...font(400, 16, 1.3), color: INK }}>{r.label}</span>
              <span style={viewPill(r.color)}>{r.view}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
