import { useState } from 'react'
import { font, card, btnPrimary, btnGhost, GREEN, RED, AMBER, INK, MUTED, FAINT, FAINTER } from '../theme'
import {
  asset, reasons, deepReason, risks, deepRisk, bullBear, deeper,
  health, healthySummary, researchStats, sourceGroups,
} from '../data'
import type { Settings, SubTab } from '../App'

const SUBTABS: Array<[SubTab, string]> = [
  ['overview', 'Overview'],
  ['why', 'Why'],
  ['risks', 'Risks'],
  ['research', 'Research'],
]

interface Props {
  sub: SubTab
  setSub: (s: SubTab) => void
  settings: Settings
  openAdvanced: () => void
}

export default function Asset({ sub, setSub, settings, openAdvanced }: Props) {
  const subStyle = (on: boolean): React.CSSProperties => ({
    ...font(400, 15),
    color: on ? INK : FAINT,
    cursor: 'pointer',
    padding: '14px 0',
    boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none',
  })

  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{ ...font(400, 34), letterSpacing: '-.01em' }}>{asset.sym}</div>
          <div style={{ ...font(400, 15, 1.4), color: MUTED, marginTop: 8 }}>{asset.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={font(400, 28)}>{asset.price}</div>
          <div style={{ ...font(400, 15), color: GREEN, marginTop: 9 }}>{asset.chg} today</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 26, margin: '30px 0 4px', borderBottom: '1px solid #e9e6e0' }}>
        {SUBTABS.map(([k, label]) => (
          <span key={k} className="hoverInk" onClick={() => setSub(k)} style={subStyle(sub === k)}>{label}</span>
        ))}
      </div>

      {sub === 'overview' && <Overview settings={settings} setSub={setSub} />}
      {sub === 'why' && <Why />}
      {sub === 'risks' && <Risks />}
      {sub === 'research' && <ResearchTab openAdvanced={openAdvanced} />}
    </div>
  )
}

function Overview({ settings, setSub }: { settings: Settings; setSub: (s: SubTab) => void }) {
  const deep = settings.answerDepth === 'full'
  const allReasons = deep ? [...reasons, deepReason] : reasons
  const allRisks = deep ? [...risks, deepRisk] : risks

  return (
    <div style={{ animation: 'sIn .3s ease both' }}>
      <div style={{ ...card, padding: 32, marginTop: 26, boxShadow: '0 1px 2px rgba(20,22,26,.04)' }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT }}>SIGNAL VIEW</div>
        <div style={{ ...font(400, 40, 1.1), letterSpacing: '-.02em', color: GREEN, marginTop: 14 }}>{asset.stance}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, marginTop: 26 }}>
          <div>
            <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Confidence</div>
            <div style={font(400, 26)}>{asset.conf}</div>
          </div>
          {settings.showExpectedReturn && (
            <div>
              <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Expected over 3 months</div>
              <div style={{ ...font(400, 26), color: GREEN }}>{asset.er}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 30 }}>
          <div style={{ position: 'relative', height: 6, background: '#eeebe5', borderRadius: 4 }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '22%', background: GREEN, borderRadius: 4, transformOrigin: 'left', animation: 'sGrow .7s ease both' }} />
            <div style={{ position: 'absolute', top: -5, left: '72%', width: 3, height: 16, borderRadius: 3, background: INK }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...font(400, 12), color: FAINTER, marginTop: 10 }}>
            <span>Bearish</span><span>Neutral</span><span>Bullish</span>
          </div>
        </div>
        <div style={{ ...font(400, 19, 1.55), color: '#2c2f35', marginTop: 30, textWrap: 'pretty' }}>{asset.headline}</div>
      </div>

      <div style={{ ...font(400, 22, 1.2), letterSpacing: '-.01em', margin: '44px 0 6px' }}>Why</div>
      {allReasons.map(r => (
        <div key={r.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #e9e6e0' }}>
          <span style={{ ...font(400, 15, 1.5), color: GREEN }}>✓</span>
          <div style={{ flex: 1 }}>
            <div style={font(400, 17, 1.45)}>{r.t}</div>
            <div style={{ ...font(400, 14, 1.5), color: MUTED, marginTop: 5 }}>{r.d}</div>
          </div>
        </div>
      ))}

      <div style={{ ...font(400, 22, 1.2), letterSpacing: '-.01em', margin: '40px 0 6px' }}>Biggest risks</div>
      {allRisks.map(r => (
        <div key={r.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #e9e6e0' }}>
          <span style={{ ...font(400, 15, 1.5), color: AMBER }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={font(400, 17, 1.45)}>{r.t}</div>
            <div style={{ ...font(400, 14, 1.5), color: MUTED, marginTop: 5 }}>{r.d}</div>
          </div>
        </div>
      ))}

      <div style={{ ...card, padding: '26px 28px', marginTop: 40 }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 12 }}>BOTTOM LINE</div>
        <div style={{ ...font(400, 17, 1.6), color: '#2c2f35', textWrap: 'pretty' }}>{asset.bottomLine}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
        <button onClick={() => setSub('why')} style={btnPrimary}>Why?</button>
        <button onClick={() => setSub('risks')} style={{ ...btnGhost, marginTop: 24 }}>What could change this?</button>
        <button onClick={() => setSub('research')} style={{ ...btnGhost, marginTop: 24 }}>See full research</button>
      </div>

      <div style={{ ...font(400, 13, 1.6), color: FAINTER, marginTop: 34, textWrap: 'pretty' }}>
        SIGNAL organises evidence and weighs it against the opposite case. It does not make the decision for you.
      </div>
    </div>
  )
}

function Why() {
  const [deeperOpen, setDeeperOpen] = useState(false)

  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: '#eeebe5' }}>
        <div style={{ flex: bullBear.up, background: GREEN, transformOrigin: 'left', animation: 'sGrow .7s ease both' }} />
        <div style={{ flex: bullBear.down, background: RED, transformOrigin: 'left', animation: 'sGrow .7s .1s ease both' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...font(400, 13), marginTop: 10 }}>
        <span style={{ color: GREEN, whiteSpace: 'nowrap' }}>Could go up · {bullBear.upP}</span>
        <span style={{ color: RED, whiteSpace: 'nowrap' }}>Could go down · {bullBear.downP}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 26 }}>
        <div style={{ ...card, padding: '26px 28px' }}>
          <div style={{ ...font(400, 20, 1.25), color: GREEN }}>Why it could go up</div>
          <div style={{ ...font(400, 34), marginTop: 14 }}>{bullBear.upP}</div>
          {bullBear.upReasons.map(r => (
            <div key={r} style={{ ...font(400, 16, 1.5), color: '#2c2f35', padding: '11px 0', borderBottom: '1px solid #efece6' }}>{r}</div>
          ))}
          <div style={{ ...font(400, 13), color: FAINT, margin: '20px 0 8px' }}>If this plays out</div>
          <div style={{ ...font(400, 24), color: GREEN }}>{bullBear.upRange}</div>
        </div>
        <div style={{ ...card, padding: '26px 28px' }}>
          <div style={{ ...font(400, 20, 1.25), color: RED }}>Why it could go down</div>
          <div style={{ ...font(400, 34), marginTop: 14 }}>{bullBear.downP}</div>
          {bullBear.downReasons.map(r => (
            <div key={r} style={{ ...font(400, 16, 1.5), color: '#2c2f35', padding: '11px 0', borderBottom: '1px solid #efece6' }}>{r}</div>
          ))}
          <div style={{ ...font(400, 13), color: FAINT, margin: '20px 0 8px' }}>If this plays out</div>
          <div style={{ ...font(400, 24), color: RED }}>{bullBear.downRange}</div>
        </div>
      </div>

      <div style={{ ...card, padding: '26px 28px', marginTop: 16 }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 12 }}>SIGNAL'S INTERPRETATION</div>
        <div style={{ ...font(400, 18, 1.6), color: '#2c2f35', textWrap: 'pretty' }}>{bullBear.interpretation}</div>
      </div>

      <div style={{ marginTop: 34 }}>
        <div onClick={() => setDeeperOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #e9e6e0', cursor: 'pointer' }}>
          <span style={{ ...font(400, 16), color: '#2f6f8f' }}>{deeperOpen ? 'Hide the detail' : 'Show a little more detail'}</span>
          <span style={{ ...font(400, 13), color: FAINTER }}>{deeperOpen ? 'Close' : 'Open'}</span>
        </div>
        {deeperOpen && (
          <div style={{ animation: 'sIn .25s ease both', paddingBottom: 8 }}>
            {deeper.map(d => (
              <div key={d.t} style={{ padding: '14px 0', borderBottom: '1px solid #efece6' }}>
                <div style={font(400, 16, 1.4)}>{d.t}</div>
                <div style={{ ...font(400, 14, 1.55), color: MUTED, marginTop: 5 }}>{d.d}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Risks() {
  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ ...font(400, 24, 1.25), letterSpacing: '-.01em' }}>What could change our mind?</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10, maxWidth: 560, textWrap: 'pretty' }}>
        These are the few things SIGNAL watches. If any of them stops looking healthy, the view changes on its own — and you get told.
      </div>
      {health.map(h => {
        const good = h.status === 'Healthy'
        const color = good ? GREEN : AMBER
        return (
          <div key={h.name} style={{ ...card, padding: '24px 26px', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={font(400, 19, 1.3)}>{h.name}</span>
              <span style={{ ...font(400, 13), color, background: good ? 'rgba(47,143,107,.1)' : 'rgba(183,131,48,.12)', padding: '7px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>{h.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, marginTop: 16 }}>
              <div>
                <div style={{ ...font(400, 12), color: FAINT, marginBottom: 7 }}>Now</div>
                <div style={font(400, 22)}>{h.now}</div>
              </div>
              <div>
                <div style={{ ...font(400, 12), color: FAINT, marginBottom: 7 }}>Worrying if</div>
                <div style={{ ...font(400, 22), color: MUTED }}>{h.danger}</div>
              </div>
            </div>
            <div style={{ position: 'relative', height: 8, background: '#f0ede7', borderRadius: 5, marginTop: 20, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '26%', background: 'rgba(192,86,63,.16)' }} />
              <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${26 + h.pos * 66}%`, width: 3, borderRadius: 3, background: color, transition: 'left .5s' }} />
            </div>
            <div style={{ ...font(400, 14, 1.55), color: MUTED, marginTop: 14 }}>{h.plain}</div>
          </div>
        )
      })}
      <div style={{ ...font(400, 14, 1.6), color: FAINTER, marginTop: 22 }}>Right now: {healthySummary}</div>
    </div>
  )
}

function ResearchTab({ openAdvanced }: { openAdvanced: () => void }) {
  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ ...card, padding: '30px 30px' }}>
        <div style={{ ...font(400, 24, 1.25), letterSpacing: '-.01em' }}>The work behind the answer</div>
        <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 12, maxWidth: 540, textWrap: 'pretty' }}>
          Six research agents read the filings, the market data, the economy and the news, then a separate model checked the numbers and an internal committee argued about the result. You don't need any of it — it's here if you want it.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginTop: 26 }}>
          {researchStats.map(s => (
            <div key={s.k}>
              <div style={font(400, 24)}>{s.v}</div>
              <div style={{ ...font(400, 13, 1.4), color: FAINT, marginTop: 7 }}>{s.k}</div>
            </div>
          ))}
        </div>
        <button onClick={openAdvanced} style={btnPrimary}>Open Advanced Research</button>
        <div style={{ ...font(400, 13, 1.55), color: FAINTER, marginTop: 14 }}>
          Built for professionals: agents, evidence graph, model calibration, historical analogies, committee debate and system architecture.
        </div>
      </div>
      {sourceGroups.map(g => (
        <div key={g.claim} style={{ padding: '18px 2px', borderBottom: '1px solid #e9e6e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <span style={font(400, 16, 1.4)}>{g.claim}</span>
            <span style={{ ...font(400, 14, 1.4), color: MUTED, whiteSpace: 'nowrap' }}>{g.strength}</span>
          </div>
          <div style={{ ...font(400, 14, 1.5), color: FAINT, marginTop: 6 }}>{g.sources}</div>
        </div>
      ))}
    </div>
  )
}
