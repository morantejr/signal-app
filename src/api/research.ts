// Reads the Python research system's RunResult: from the local API when
// VITE_RESEARCH_API is set, otherwise from the static export in public/runs/.

export interface RSource { source_id: string; kind: string; title: string; url: string | null; excerpt?: string | null }
export interface RClaim { claim_id: string; text: string; stance: 'bull' | 'bear' | 'neutral' | 'context'; support: 'sourced' | 'inference' | 'unsupported'; source_ids: string[]; confidence: number }
export interface RMemo { side: 'bull' | 'bear'; summary: string; claims: RClaim[]; steelman_of_other_side: string; missing_data: string[]; model: string | null; provider: string | null; is_stub: boolean }
export interface RDisagreement { quant_band: string; quant_score: number | null; narrative_lean: string; agree: boolean; disagreement_summary: string; quant_may_be_wrong_because: string[]; narrative_may_be_wrong_because: string[] }
export interface RBrief { one_view: string; narrative_lean: string; claims: RClaim[]; kill_criteria: string[]; disagreement: RDisagreement; model: string | null; is_stub: boolean }
export interface RComponent { name: string; value: number | null; weight: number; note: string }
export interface RQuant { quant_score: number | null; quant_band: string; quant_version: string; computed_at: string; components: RComponent[]; freshness_flags: string[]; drivers: string[] }
export interface RCritic { flags: string[]; unsupported_claim_ids: string[]; dangling_source_ids: string[]; sourced_share_high_conf: number | null }
export interface RunResult {
  run_id: string; ticker: string; thesis: string | null; horizon: string; created_at: string
  sources: RSource[]; quant: RQuant; bull: RMemo; bear: RMemo; brief: RBrief; critic: RCritic
  models: Record<string, string>; is_prototype: boolean
}
export interface RunIndexEntry { ticker: string; run_id: string; created_at: string; quant_score: number | null; quant_band: string; narrative_lean: string; agree: boolean; is_stub: boolean }

const API = (import.meta.env.VITE_RESEARCH_API as string | undefined)?.replace(/\/$/, '')
const STATIC = `${import.meta.env.BASE_URL}runs/`

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

export async function fetchRun(sym: string): Promise<RunResult | null> {
  const s = sym.toUpperCase()
  if (API) {
    const r = await getJson<RunResult>(`${API}/research/${s}`)
    if (r) return r
  }
  return getJson<RunResult>(`${STATIC}${s}.json`)
}

export async function fetchRunIndex(): Promise<Record<string, RunIndexEntry>> {
  const idx = await getJson<{ runs: RunIndexEntry[] }>(`${STATIC}index.json`)
  return Object.fromEntries((idx?.runs ?? []).map(e => [e.ticker, e]))
}

export const bandLabel = (b: string) => ({ attractive: 'Attractive', fair: 'Fair', expensive: 'Expensive', unknown: 'Unknown' })[b] ?? b
export const leanLabel = (l: string) => ({ bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral', mixed: 'Mixed' })[l] ?? l
