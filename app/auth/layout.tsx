export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', background: 'var(--bg)',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, background: 'var(--coral)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}>🏡</div>
          <span style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--ink)' }}>
            Side by Side
          </span>
        </div>
        <p style={{ color: 'var(--ink2)', fontSize: '0.875rem' }}>
          A shared home organiser for two
        </p>
      </div>
      {children}
    </div>
  )
}
