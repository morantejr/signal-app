export const GREEN = '#2f8f6b'
export const RED = '#c0563f'
export const AMBER = '#b78330'
export const INK = '#16181c'
export const MUTED = '#8e939a'
export const FAINT = '#9a9ea5'
export const FAINTER = '#a5a9af'
export const F = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export const font = (weight: number, size: number, lineHeight: number | string = 1) =>
  ({ fontWeight: weight, fontSize: size, lineHeight: String(lineHeight), fontFamily: F }) as const

export const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e6e2da',
  borderRadius: 16,
}

export const btnBase: React.CSSProperties = {
  ...font(400, 16),
  padding: '15px 22px',
  borderRadius: 11,
  cursor: 'pointer',
  transition: 'opacity .2s',
}

export const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: INK,
  color: '#fff',
  border: 0,
  marginTop: 24,
}

export const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: INK,
  border: '1px solid #dcd7cd',
}

export const viewPill = (color: string): React.CSSProperties => ({
  ...font(400, 15, 1),
  color,
  whiteSpace: 'nowrap',
})
