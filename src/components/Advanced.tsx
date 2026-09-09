import { font } from '../theme'

export default function Advanced({ close }: { close: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#08090a', display: 'flex', flexDirection: 'column', animation: 'sFade .3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 16px', background: '#0b0d0f', borderBottom: '1px solid #1e2328' }}>
        <span style={{ ...font(400, 11), letterSpacing: '.14em', color: '#8b949c' }}>ADVANCED RESEARCH</span>
        <button
          className="advBack"
          onClick={close}
          style={{ background: '#151a1e', border: '1px solid #2c3740', color: '#cfe9f5', ...font(400, 11), letterSpacing: '.08em', padding: '9px 13px', borderRadius: 4, cursor: 'pointer' }}
        >
          Back to the simple view
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src="/advanced/SIGNAL.dc.html"
          title="Advanced Research terminal"
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    </div>
  )
}
