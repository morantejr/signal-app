import { useState } from 'react'
import { font, card, btnPrimary, btnGhost, GREEN, RED, AMBER, INK, MUTED, FAINT, FAINTER } from '../theme'
import type { Settings, SubTab, AskError } from '../App'
import type { Analysis } from '../analysis'
import { fmtPrice, fmtPct } from '../format'
import KeyPrompt from './KeyPrompt'

const SUBTABS: Array<[SubTab, string]> = [
  ['overview', 'Overview'],
  ['why', 'Why'],
  ['risks', 'Risks'],
  ['research', 'Research'],
]

interface Props {
  a: Analysis | null
  error: AskError | null
  askedQ: string
  retry: () => void
  sub: SubTab
  setSub: (s: SubTab) => void
  settings: Settings
  openAdvanced: () => void
}

export default function Asset({ a, error, askedQ, retry, sub, setSub, settings, openAdvanced }: Props) {
  const subStyle = (on: boolean): React.CSSProperties => ({
    ...font(400, 15),
    color: on ? INK : FAINT,
    cursor: 'pointer',
    padding: '14px 0',
    boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none',
  })

  if (!a) {
    return (
      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .4s ease both' }}>
        <div style={{ ...font(400, 15, 1.4), color: FAINT }}>{askedQ}</div>
        {error?.kind === 'nokey' ? (
          <KeyPrompt onSaved={retry} />
        ) : (
          <div style={{ ...card, padding: 32, marginTop: 20 }}>
            <div style={{ ...font(400, 26, 1.25), letterSpacing: '-.01em' }}>SIGNAL could not answer that</div>
            <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 12, textWrap: 'pretty' }}>{error?.message ?? 'Something went wrong.'}</div>
            <button onClick={retry} style={btnPrimary}>Try again</button>
          </div>
        )}
      </div>
    )
  }

  const up = a.chg >= 0
  return (
    <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '44px 24px 120px', animation: 'sIn .4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{ ...font(400, 34), letterSpacing: '-.01em' }}>{a.sym}</div>
          <div style={{ ...font(400, 15, 1.4), color: MUTED, marginTop: 8 }}>{a.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={font(400, 28)}>{fmtPrice(a.price)}</div>
          <div style={{ ...font(400, 15), color: up ? GREEN : RED, marginTop: 9 }}>{fmtPct(a.chg)} today</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 26, margin: '30px 0 4px', borderBottom: '1px solid #e9e6e0' }}>
        {SUBTABS.map(([k, label]) => (
          <span key={k} className="hoverInk" onClick={() => setSub(k)} style={subStyle(sub === k)}>{label}</span>
        ))}
      </div>

      {sub === 'overview' && <Overview a={a} settings={settings} setSub={setSub} />}
      {sub === 'why' && <Why a={a} />}
      {sub === 'risks' && <Risks a={a} />}
      {sub === 'research' && <ResearchTab a={a} openAdvanced={openAdvanced} />}
    </div>
  )
}

function Overview({ a, settings, setSub }: { a: Analysis; settings: Settings; setSub: (s: SubTab) => void }) {
  const deep = settings.answerDepth === 'full'
  const allReasons = deep && a.deepReason ? [...a.reasons, a.deepReason] : a.reasons
  const allRisks = deep && a.deepRisk ? [...a.risks, a.deepRisk] : a.risks
  const marker = 50 + a.score / 2
  const fillLeft = a.score >= 0 ? 50 : marker
  const fillWidth = Math.abs(a.score) / 2

  return (
    <div style={{ animation: 'sIn .3s ease both' }}>
      <div style={{ ...card, padding: 32, marginTop: 26, boxShadow: '0 1px 2px rgba(20,22,26,.04)' }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT }}>SIGNAL VIEW</div>
        <div style={{ ...font(400, 40, 1.1), letterSpacing: '-.02em', color: a.color, marginTop: 14 }}>{a.stance}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, marginTop: 26 }}>
          <div>
            <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Confidence</div>
            <div style={font(400, 26)}>{a.confidence}%</div>
          </div>
          {settings.showExpectedReturn && a.er != null && (
            <div>
              <div style={{ ...font(400, 13), color: FAINT, marginBottom: 9 }}>Expected over 3 months</div>
              <div style={{ ...font(400, 26), color: a.er > 0 ? GREEN : a.er < 0 ? RED : AMBER }}>{fmtPct(a.er, 0)}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 30 }}>
          <div style={{ position: 'relative', height: 6, background: '#eeebe5', borderRadius: 4 }}>
            <div style={{ position: 'absolute', left: `${fillLeft}%`, top: 0, bottom: 0, width: `${fillWidth}%`, background: a.color, borderRadius: 4, transformOrigin: a.score >= 0 ? 'left' : 'right', animation: 'sGrow .7s ease both' }} />
            <div style={{ position: 'absolute', top: -5, left: `calc(${marker}% - 1px)`, width: 3, height: 16, borderRadius: 3, background: INK }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...font(400, 12), color: FAINTER, marginTop: 10 }}>
            <span>Bearish</span><span>Neutral</span><span>Bullish</span>
          </div>
        </div>
        <div style={{ ...font(400, 19, 1.55), color: '#2c2f35', marginTop: 30, textWrap: 'pretty' }}>{a.headline}</div>
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
        <div style={{ ...font(400, 17, 1.6), color: '#2c2f35', textWrap: 'pretty' }}>{a.bottomLine}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
        <button onClick={() => setSub('why')} style={btnPrimary}>Why?</button>
        <button onClick={() => setSub('risks')} style={{ ...btnGhost, marginTop: 24 }}>What could change this?</button>
        <button onClick={() => setSub('research')} style={{ ...btnGhost, marginTop: 24 }}>See full research</button>
      </div>

      <div style={{ ...font(400, 13, 1.6), color: FAINTER, marginTop: 34, textWrap: 'pretty' }}>
        SIGNAL organises evidence and weighs it against the opposite case. It does not make the decision for you. Live data from Finnhub as of {new Date(a.asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
      </div>
    </div>
  )
}

function Why({ a }: { a: Analysis }) {
  const [deeperOpen, setDeeperOpen] = useState(false)

  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: '#eeebe5' }}>
        <div style={{ flex: a.bull.p, background: GREEN, transformOrigin: 'left', animation: 'sGrow .7s ease both' }} />
        <div style={{ flex: a.bear.p, background: RED, transformOrigin: 'left', animation: 'sGrow .7s .1s ease both' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...font(400, 13), marginTop: 10 }}>
        <span style={{ color: GREEN, whiteSpace: 'nowrap' }}>Could go up · {a.bull.p}%</span>
        <span style={{ color: RED, whiteSpace: 'nowrap' }}>Could go down · {a.bear.p}%</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 26 }}>
        <div style={{ ...card, padding: '26px 28px' }}>
          <div style={{ ...font(400, 20, 1.25), color: GREEN }}>Why it could go up</div>
          <div style={{ ...font(400, 34), marginTop: 14 }}>{a.bull.p}%</div>
          {a.bull.reasons.map(r => (
            <div key={r} style={{ ...font(400, 16, 1.5), color: '#2c2f35', padding: '11px 0', borderBottom: '1px solid #efece6' }}>{r}</div>
          ))}
          <div style={{ ...font(400, 13), color: FAINT, margin: '20px 0 8px' }}>If this plays out</div>
          <div style={{ ...font(400, 24), color: GREEN }}>{a.bull.range}</div>
        </div>
        <div style={{ ...card, padding: '26px 28px' }}>
          <div style={{ ...font(400, 20, 1.25), color: RED }}>Why it could go down</div>
          <div style={{ ...font(400, 34), marginTop: 14 }}>{a.bear.p}%</div>
          {a.bear.reasons.map(r => (
            <div key={r} style={{ ...font(400, 16, 1.5), color: '#2c2f35', padding: '11px 0', borderBottom: '1px solid #efece6' }}>{r}</div>
          ))}
          <div style={{ ...font(400, 13), color: FAINT, margin: '20px 0 8px' }}>If this plays out</div>
          <div style={{ ...font(400, 24), color: RED }}>{a.bear.range}</div>
        </div>
      </div>

      <div style={{ ...card, padding: '26px 28px', marginTop: 16 }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 12 }}>SIGNAL'S INTERPRETATION</div>
        <div style={{ ...font(400, 18, 1.6), color: '#2c2f35', textWrap: 'pretty' }}>{a.interpretation}</div>
      </div>

      <div style={{ marginTop: 34 }}>
        <div onClick={() => setDeeperOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #e9e6e0', cursor: 'pointer' }}>
          <span style={{ ...font(400, 16), color: '#2f6f8f' }}>{deeperOpen ? 'Hide the detail' : 'Show a little more detail'}</span>
          <span style={{ ...font(400, 13), color: FAINTER }}>{deeperOpen ? 'Close' : 'Open'}</span>
        </div>
        {deeperOpen && (
          <div style={{ animation: 'sIn .25s ease both', paddingBottom: 8 }}>
            {a.deeper.map(d => (
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

function Risks({ a }: { a: Analysis }) {
  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ ...font(400, 24, 1.25), letterSpacing: '-.01em' }}>What could change our mind?</div>
      <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 10, maxWidth: 560, textWrap: 'pretty' }}>
        These are the few things SIGNAL watches. If any of them stops looking healthy, the view changes on its own the next time you ask.
      </div>
      {a.health.map(h => {
        const color = h.status === 'Healthy' ? GREEN : h.status === 'Watching' ? AMBER : RED
        const bg = h.status === 'Healthy' ? 'rgba(47,143,107,.1)' : h.status === 'Watching' ? 'rgba(183,131,48,.12)' : 'rgba(192,86,63,.12)'
        return (
          <div key={h.name} style={{ ...card, padding: '24px 26px', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={font(400, 19, 1.3)}>{h.name}</span>
              <span style={{ ...font(400, 13), color, background: bg, padding: '7px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>{h.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, marginTop: 16, flexWrap: 'wrap' }}>
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
      <div style={{ ...font(400, 14, 1.6), color: FAINTER, marginTop: 22 }}>Right now: {a.healthySummary}</div>
    </div>
  )
}

function ResearchTab({ a, openAdvanced }: { a: Analysis; openAdvanced: () => void }) {
  return (
    <div style={{ animation: 'sIn .3s ease both', marginTop: 26 }}>
      <div style={{ ...card, padding: '30px 30px' }}>
        <div style={{ ...font(400, 24, 1.25), letterSpacing: '-.01em' }}>The work behind the answer</div>
        <div style={{ ...font(400, 16, 1.6), color: MUTED, marginTop: 12, maxWidth: 540, textWrap: 'pretty' }}>
          SIGNAL read the live price, the company's fundamentals, analyst ratings, its recent results and the news, then ran six independent checks and weighed them against each other. You don't need any of it. It's here if you want it.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginTop: 26 }}>
          {a.research.stats.map(s => (
            <div key={s.k}>
              <div style={font(400, 24)}>{s.v}</div>
              <div style={{ ...font(400, 13, 1.4), color: FAINT, marginTop: 7 }}>{s.k}</div>
            </div>
          ))}
        </div>
        <button onClick={openAdvanced} style={btnPrimary}>Open Advanced Research</button>
        <div style={{ ...font(400, 13, 1.55), color: FAINTER, marginTop: 14 }}>
          Built for professionals: agents, evidence graph, model calibration, historical analogies, committee debate and system architecture. The terminal is a design prototype with illustrative numbers; the agents behind it are not public yet.
        </div>
      </div>
      {a.research.claims.map(g => (
        <div key={g.claim} style={{ padding: '18px 2px', borderBottom: '1px solid #e9e6e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <span style={font(400, 16, 1.4)}>{g.claim}</span>
            <span style={{ ...font(400, 14, 1.4), color: MUTED, whiteSpace: 'nowrap' }}>{g.strength}</span>
          </div>
          <div style={{ ...font(400, 14, 1.5), color: FAINT, marginTop: 6 }}>{g.sources}</div>
        </div>
      ))}
      {a.research.news.length > 0 && (
        <>
          <div style={{ ...font(400, 22, 1.2), letterSpacing: '-.01em', margin: '40px 0 6px' }}>In the news</div>
          {a.research.news.map(n => (
            <a key={n.id} href={n.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '16px 2px', borderBottom: '1px solid #e9e6e0', color: INK }}>
              <div style={font(400, 16, 1.45)}>{n.headline}</div>
              <div style={{ ...font(400, 13, 1.5), color: FAINT, marginTop: 6 }}>{n.source} · {new Date(n.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </a>
          ))}
        </>
      )}
    </div>
  )
}
