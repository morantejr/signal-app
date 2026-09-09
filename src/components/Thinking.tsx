import { font, INK, FAINT } from '../theme'
import { thinkLines } from '../data'

interface Props {
  askedQ: string
  step: number
}

export default function Thinking({ askedQ, step }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 24px', animation: 'sFade .3s ease both' }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ ...font(400, 15, 1.4), color: FAINT, marginBottom: 14 }}>{askedQ}</div>
        <div style={{ ...font(400, 26, 1.3), letterSpacing: '-.01em', animation: 'sBreathe 1.8s ease-in-out infinite' }}>
          {thinkLines[Math.min(step, thinkLines.length - 1)]}
        </div>
        <div style={{ height: 2, background: '#e6e2da', borderRadius: 2, marginTop: 26, overflow: 'hidden' }}>
          <div style={{ width: `${(step + 1) * 25}%`, height: '100%', background: INK, opacity: .55, transition: 'width .5s' }} />
        </div>
      </div>
    </div>
  )
}
