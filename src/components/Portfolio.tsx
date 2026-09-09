import { font, card, GREEN, AMBER, INK, MUTED, FAINT, viewPill } from '../theme'
import { holdings } from '../data'

export default function Portfolio({ openAsset }: { openAsset: () => void }) {
  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .35s ease both' }}>
      <div style={{ ...font(400, 32, 1.15), letterSpacing: '-.02em' }}>Portfolio</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, marginTop: 24 }}>
        <div>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Value</div>
          <div style={font(400, 28)}>$2.41M</div>
        </div>
        <div>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Expected over 3 months</div>
          <div style={{ ...font(400, 28), color: GREEN }}>+8.6%</div>
        </div>
        <div>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Ups and downs</div>
          <div style={font(400, 28)}>Bumpy</div>
        </div>
      </div>
      <div style={{ ...card, padding: '28px 30px', marginTop: 26 }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 12 }}>ONE THING TO KNOW</div>
        <div style={{ ...font(400, 20, 1.45), color: INK, textWrap: 'pretty' }}>
          Four of your five holdings rise and fall with the same thing: how much companies spend on AI advertising and software.
        </div>
        <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 14, textWrap: 'pretty' }}>
          It looks like five separate bets. It behaves like about two. If that spending slows, most of the portfolio moves down together.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
          <div style={{ flex: 1, height: 8, background: '#f0ede7', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: '71%', height: '100%', background: AMBER, transformOrigin: 'left', animation: 'sGrow .7s ease both' }} />
          </div>
          <span style={{ ...font(400, 15), color: AMBER }}>71% linked</span>
        </div>
      </div>
      {holdings.map(h => (
        <div key={h.sym} className="hoverFade" onClick={openAsset} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 2px', borderBottom: '1px solid #e9e6e0', cursor: 'pointer' }}>
          <span style={{ width: 74, ...font(400, 17) }}>{h.sym}</span>
          <span style={{ width: 64, ...font(400, 15), color: MUTED }}>{h.w}</span>
          <span style={{ flex: 1, ...font(400, 15, 1.4), color: MUTED }}>{h.driver}</span>
          <span style={viewPill(h.color)}>{h.view}</span>
        </div>
      ))}
    </div>
  )
}
