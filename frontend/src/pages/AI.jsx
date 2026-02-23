import { useState } from 'react'
import { api } from '../api/client'

export default function AI() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    setResult('')
    try {
      // Fetch all cases to send for analysis
      const data = await api.cases.list({ per_page: 10000 })
      const cases = data.cases || []
      if (cases.length === 0) {
        setError('No cases to analyse yet.')
        return
      }
      const res = await api.ai.analyze({ cases })
      setResult(res.analysis)
    } catch (err) {
      setError(err.message || 'Analysis failed. Check that CLAUDE_API_KEY is set on the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">AI Pattern Analysis</div>
          <div className="page-sub">Identify trends across your caseload using Claude</div>
        </div>
      </div>

      <div className="ai-panel">
        <div className="ai-orb" />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 20, color: 'var(--text)', marginBottom: 5 }}>
            ✦ Claude Analysis
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 20 }}>
            Your case data is analysed server-side. The Claude API key is never sent to your browser.
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
          )}

          <button
            style={{
              width: '100%',
              marginBottom: 9,
              background: 'linear-gradient(135deg,var(--blue2),var(--teal))',
              color: 'white',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 9,
              fontFamily: 'Plus Jakarta Sans,sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onClick={run}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Analysing…
              </>
            ) : (
              '✦ Analyse Patterns'
            )}
          </button>

          {result && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: 18,
                marginTop: 16,
                fontSize: 13,
                lineHeight: 1.8,
                color: '#a8b4d0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {result}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">About AI Analysis</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          ProLog uses Claude (Anthropic) to analyse patterns across your clinical cases. Your case data is
          sent securely from the server to Anthropic's API — it never passes through your browser or any
          third-party service.
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginTop: 12 }}>
          The analysis covers: presentation patterns, outcome trends, procedure distribution, cases that may
          need attention, and clinical recommendations. Patient IDs are included as anonymised identifiers
          only.
        </p>
      </div>
    </div>
  )
}
