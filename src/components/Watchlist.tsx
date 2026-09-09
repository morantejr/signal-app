import { font, MUTED, FAINT, FAINTER, viewPill } from '../theme'
import { watchlist } from '../data'

export default function Watchlist({ openAsset }: { openAsset: () => void }) {
  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .35s ease both' }}>
      <div style={{ ...font(400, 32, 1.15), letterSpacing: '-.02em' }}>Watchlist</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10 }}>
        SIGNAL keeps watching these and tells you when its view changes.
      </div>
      {watchlist.map(w => (
        <div key={w.sym} className="hoverFade" onClick={openAsset} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 2px', borderBottom: '1px solid #e9e6e0', cursor: 'pointer' }}>
          <div style={{ width: 74 }}>
            <div style={font(400, 18)}>{w.sym}</div>
            <div style={{ ...font(400, 13), color: FAINT, marginTop: 7 }}>{w.price}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={viewPill(w.color)}>{w.view}</div>
            <div style={{ ...font(400, 14, 1.45), color: MUTED, marginTop: 5 }}>{w.note}</div>
          </div>
          <div style={{ textAlign: 'right', width: 96 }}>
            <div style={font(400, 16)}>{w.conf}</div>
            <div style={{ ...font(400, 12), color: FAINTER, marginTop: 7 }}>confidence</div>
          </div>
        </div>
      ))}
    </div>
  )
}
