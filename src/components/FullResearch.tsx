import { useState } from 'react'
import { font, card, btnGhost, GREEN, RED, AMBER, INK, MUTED, FAINT, FAINTER } from '../theme'
import { bandLabel, leanLabel, type RunResult, type RClaim, type RMemo } from '../api/research'

const bandColor = (b: string) => (b === 'attractive' ? GREEN : b === 'expensive' ? RED : b === 'fair' ? AMBER : FAINT)
const leanColor = (l: string) => (l === 'bullish' ? GREEN : l === 'bearish' ? RED : AMBER)
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Overview card: quant vs narrative, and whether they agree. */
export default function FullResearch({ run, loading, sym, onReadMemos }: { run: RunResult | null; loading: boolean; sym: string; onReadMemos: () => void }) {
  if (!run) {
    return (
      <div style={{ ...font(400, 13, 1.6), color: FAINTER, marginTop: 14 }}>
        {loading ? 'Looking for full research…' : `Full research (evidence, bull and bear memos, synthesis) has not been run for ${sym} yet. The quick read above is from live market data only.`}
      </div>
    )
  }
  const d = run.brief.disagreement
  const stub = run.brief.is_stub || run.bull.is_stub || run.bear.is_stub
  return (
    <div style={{ ...card, padding: '28px 30px', marginTop: 16, borderColor: d.agree ? '#e6e2da' : 'rgba(183,131,48,.45)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT }}>FULL RESEARCH · QUANT {run.quant.quant_version.toUpperCase()} + BULL / BEAR MEMOS</div>
        <span style={{ ...font(400, 13), color: d.agree ? GREEN : AMBER, background: d.agree ? 'rgba(47,143,107,.1)' : 'rgba(183,131,48,.12)', padding: '5px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{d.agree ? 'Quant and narrative agree' : 'Quant and narrative disagree'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24, marginTop: 20 }}>
        <div>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 8 }}>Quant, computed in code</div>
          <div style={{ ...font(400, 28, 1.1), color: bandColor(d.quant_band) }}>{bandLabel(d.quant_band)}{d.quant_score != null && <span style={{ ...font(400, 16), color: MUTED, marginLeft: 8 }}>{d.quant_score > 0 ? '+' : ''}{d.quant_score}</span>}</div>
        </div>
        <div>
          <div style={{ ...font(400, 13), color: FAINT, marginBottom: 8 }}>Narrative, from the memos</div>
          <div style={{ ...font(400, 28, 1.1), color: leanColor(d.narrative_lean) }}>{leanLabel(d.narrative_lean)}</div>
        </div>
      </div>
      <div style={{ ...font(400, 16, 1.6), color: '#2c2f35', marginTop: 18, textWrap: 'pretty' }}>{d.disagreement_summary}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginTop: 18 }}>
        <Bullets title="Where the quant could be wrong" items={d.quant_may_be_wrong_because} />
        <Bullets title="Where the narrative could be wrong" items={d.narrative_may_be_wrong_because} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 20 }}>
        <button onClick={onReadMemos} style={{ ...btnGhost, padding: '11px 16px', ...font(400, 15) }}>Read the memos</button>
        <span style={{ ...font(400, 13, 1.5), color: FAINTER }}>
          {stub ? 'Memos are stubs built from quant components (no model key on the research side). ' : `Models: bull ${run.models.bull} · bear ${run.models.bear} · synthesis ${run.models.synthesis}. `}
          Run {when(run.created_at)}.
        </span>
      </div>
    </div>
  )
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div style={{ ...font(400, 13), color: FAINT, marginBottom: 6 }}>{title}</div>
      {items.map(x => (
        <div key={x} style={{ ...font(400, 14, 1.5), color: MUTED, padding: '5px 0', borderBottom: '1px solid #efece6' }}>{x}</div>
      ))}
    </div>
  )
}

const supportStyle = (s: RClaim['support']) => ({
  sourced: { color: GREEN, bg: 'rgba(47,143,107,.1)', label: 'Sourced' },
  inference: { color: AMBER, bg: 'rgba(183,131,48,.12)', label: 'Inference' },
  unsupported: { color: RED, bg: 'rgba(192,86,63,.12)', label: 'Unsupported' },
})[s]

function Claims({ claims, sources }: { claims: RClaim[]; sources: Record<string, { title: string; url: string | null }> }) {
  return (
    <>
      {claims.map(c => {
        const st = supportStyle(c.support)
        return (
          <div key={c.claim_id} style={{ padding: '12px 0', borderBottom: '1px solid #efece6' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ ...font(400, 12), color: st.color, background: st.bg, padding: '4px 8px', borderRadius: 20, whiteSpace: 'nowrap', marginTop: 2 }}>{st.label}</span>
              <div style={{ flex: 1 }}>
                <div style={{ ...font(400, 15, 1.5), color: '#2c2f35' }}>{c.text}</div>
                <div style={{ ...font(400, 12, 1.5), color: FAINTER, marginTop: 4 }}>
                  confidence {Math.round(c.confidence * 100)}%
                  {c.source_ids.length > 0 && ' · '}
                  {c.source_ids.map((sid, i) => {
                    const src = sources[sid]
                    return (
                      <span key={sid}>
                        {i > 0 && ', '}
                        {src?.url ? <a href={src.url} target="_blank" rel="noreferrer" title={src.title}>{sid}</a> : <span title={src?.title}>{sid}</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function MemoCard({ memo, sources }: { memo: RMemo; sources: Record<string, { title: string; url: string | null }> }) {
  const color = memo.side === 'bull' ? GREEN : RED
  return (
    <div style={{ ...card, padding: '24px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ ...font(400, 20, 1.25), color }}>{memo.side === 'bull' ? 'The case for' : 'The case against'}</div>
        <span style={{ ...font(400, 12), color: FAINTER }}>{memo.is_stub ? 'stub' : memo.model}</span>
      </div>
      <div style={{ ...font(400, 15, 1.6), color: '#2c2f35', marginTop: 12, textWrap: 'pretty' }}>{memo.summary}</div>
      <div style={{ marginTop: 10 }}>
        <Claims claims={memo.claims} sources={sources} />
      </div>
      {memo.steelman_of_other_side && memo.steelman_of_other_side !== '(stub)' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...font(400, 12), letterSpacing: '.06em', color: FAINT, marginBottom: 6 }}>THE OTHER SIDE, IN ITS OWN WORDS</div>
          <div style={{ ...font(400, 14, 1.55), color: MUTED, textWrap: 'pretty' }}>{memo.steelman_of_other_side}</div>
        </div>
      )}
      {memo.missing_data.length > 0 && <div style={{ ...font(400, 12, 1.5), color: FAINTER, marginTop: 12 }}>Missing: {memo.missing_data.join('; ')}</div>}
    </div>
  )
}

/** Research tab: memos, synthesis, critic, sources. */
export function ResearchCard({ run, loading, sym }: { run: RunResult | null; loading: boolean; sym: string }) {
  const [showSources, setShowSources] = useState(false)
  if (!run) {
    return (
      <div style={{ ...card, padding: '26px 28px' }}>
        <div style={{ ...font(400, 20, 1.3) }}>Full research</div>
        <div style={{ ...font(400, 15, 1.6), color: MUTED, marginTop: 8, textWrap: 'pretty' }}>
          {loading ? 'Looking for a research run…' : `No research run exists for ${sym} yet. Runs come from the Python research system (evidence from filings and market data, a code-computed quant score, bull and bear memos, and a synthesis that shows where they disagree).`}
        </div>
      </div>
    )
  }
  const sources = Object.fromEntries(run.sources.map(s => [s.source_id, { title: s.title, url: s.url }]))
  const d = run.brief.disagreement
  const sourcedShare = run.critic.sourced_share_high_conf
  return (
    <div>
      <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT, marginBottom: 10 }}>FULL RESEARCH · {run.ticker} · {when(run.created_at)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <MemoCard memo={run.bull} sources={sources} />
        <MemoCard memo={run.bear} sources={sources} />
      </div>

      <div style={{ ...card, padding: '26px 28px', marginTop: 16, borderColor: d.agree ? '#e6e2da' : 'rgba(183,131,48,.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ ...font(400, 20, 1.25) }}>One view</div>
          <span style={{ ...font(400, 12), color: FAINTER }}>{run.brief.is_stub ? 'stub' : run.brief.model}</span>
        </div>
        <div style={{ ...font(400, 16, 1.6), color: '#2c2f35', marginTop: 12, textWrap: 'pretty' }}>{run.brief.one_view}</div>
        <div style={{ ...font(400, 14, 1.5), color: MUTED, marginTop: 14 }}>
          Quant <span style={{ color: bandColor(d.quant_band) }}>{bandLabel(d.quant_band).toLowerCase()}{d.quant_score != null ? ` (${d.quant_score})` : ''}</span> · narrative <span style={{ color: leanColor(d.narrative_lean) }}>{leanLabel(d.narrative_lean).toLowerCase()}</span> · {d.agree ? 'they agree' : 'they disagree'}
        </div>
        {run.brief.claims.length > 0 && <div style={{ marginTop: 10 }}><Claims claims={run.brief.claims} sources={sources} /></div>}
        {run.brief.kill_criteria.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...font(400, 12), letterSpacing: '.06em', color: FAINT, marginBottom: 6 }}>WHAT WOULD PROVE THIS WRONG</div>
            {run.brief.kill_criteria.map(k => (
              <div key={k} style={{ ...font(400, 14, 1.5), color: MUTED, padding: '5px 0', borderBottom: '1px solid #efece6' }}>{k}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, padding: '22px 26px', marginTop: 16 }}>
        <div style={{ ...font(400, 13), letterSpacing: '.06em', color: FAINT }}>QUANT {run.quant.quant_version.toUpperCase()} · CODE ONLY</div>
        {run.quant.components.map(c => (
          <div key={c.name} style={{ display: 'flex', gap: 14, padding: '9px 0', borderBottom: '1px solid #efece6' }}>
            <span style={{ ...font(400, 14), width: 120, color: INK }}>{c.name.replace('_', ' ')}</span>
            <span style={{ ...font(400, 14), width: 52, color: c.value == null ? FAINTER : c.value > 0 ? GREEN : c.value < 0 ? RED : MUTED }}>{c.value == null ? '—' : (c.value > 0 ? '+' : '') + c.value.toFixed(2)}</span>
            <span style={{ ...font(400, 13, 1.45), color: MUTED, flex: 1 }}>{c.note}</span>
          </div>
        ))}
        {run.quant.freshness_flags.length > 0 && <div style={{ ...font(400, 12, 1.5), color: AMBER, marginTop: 10 }}>Flags: {run.quant.freshness_flags.join(', ')}</div>}
      </div>

      <div style={{ ...font(400, 13, 1.6), color: FAINTER, marginTop: 16 }}>
        Checks: {run.critic.flags.length ? run.critic.flags.join(', ') : 'no flags'}
        {sourcedShare != null && ` · ${Math.round(sourcedShare * 100)}% of confident claims cite a real source`}
        {' · '}
        <a href="#" onClick={e => { e.preventDefault(); setShowSources(o => !o) }}>{showSources ? 'Hide' : 'Show'} the {run.sources.length} sources</a>
      </div>
      {showSources && (
        <div style={{ marginTop: 8 }}>
          {run.sources.map(s => (
            <div key={s.source_id} style={{ ...font(400, 13, 1.5), padding: '7px 0', borderBottom: '1px solid #efece6' }}>
              <span style={{ color: FAINTER }}>[{s.source_id}]</span> {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
