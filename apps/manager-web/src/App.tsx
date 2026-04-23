import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'
import './index.css'

type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'

interface HeadcountResponse {
  mealDate: string
  mealType: MealType
  totalOrders: number
  byTopup: Array<{ topup: string; count: number }>
}

interface TokenRow {
  _id: string
  tokenNo: string
  status: string
}

interface ProductionItem {
  _id: Record<string, string>
  count: number
}

const TOKEN_KEY = 'optimess.manager.token'
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']

function isoDateNow() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [mealDate, setMealDate] = useState(isoDateNow())
  const [mealType, setMealType] = useState<MealType>('LUNCH')
  const [rfid, setRfid] = useState('')

  const [headcount, setHeadcount] = useState<HeadcountResponse | null>(null)
  const [production, setProduction] = useState<ProductionItem[]>([])
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [scannedOrder, setScannedOrder] = useState<any>(null)
  const [activeNav, setActiveNav] = useState<'dashboard' | 'operations' | 'reports'>('dashboard')

  const tokenSummary = useMemo(() => {
    const served = tokens.filter((item) => item.status === 'SERVED').length
    const pending = tokens.filter((item) => item.status !== 'SERVED').length
    return { served, pending, total: tokens.length }
  }, [tokens])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await apiRequest<{ token: string }>('/auth/manager/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      localStorage.setItem(TOKEN_KEY, res.token)
      setToken(res.token)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  async function fetchDashboard() {
    if (!token) return
    try {
      const [headcountRes, productionRes, tokenRes] = await Promise.all([
        apiRequest<HeadcountResponse>(
          `/manager/dashboard/headcount?mealDate=${mealDate}&mealType=${mealType}`,
          { token }
        ),
        apiRequest<ProductionItem[]>(
          `/manager/production-plan?mealDate=${mealDate}&mealType=${mealType}`,
          { token }
        ),
        apiRequest<TokenRow[]>(
          `/manager/tokens/live?mealDate=${mealDate}&mealType=${mealType}`,
          { token }
        ),
      ])

      setHeadcount(headcountRes)
      setProduction(productionRes)
      setTokens(tokenRes)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleServeByRfid() {
    if (!token || !rfid) return
    try {
      const res = await apiRequest<any>(`/manager/tokens/serve-by-rfid`, {
        token,
        method: 'POST',
        body: JSON.stringify({ rfidTag: rfid, mealDate, mealType }),
      })
      setMessage('Token marked as served!')
      setScannedOrder(res)
      setRfid('')
      await fetchDashboard()
    } catch (err: any) {
      setError(err.message)
      setScannedOrder(null)
    }
  }

  useEffect(() => {
    if (token) fetchDashboard()
  }, [token, mealDate, mealType])

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Optimess</h1>
          <p className="login-subtitle">Manager Portal</p>
          <form onSubmit={handleLogin} className="login-form">
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="login-input" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" />
            <button type="submit" className="login-btn">Login</button>
          </form>
          {error && <div className="error-banner" style={{ marginTop: '16px' }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">Optimess</h1>
          <p className="sidebar-subtitle">Operations Manager</p>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>📊 Dashboard</button>
          <button className={`nav-item ${activeNav === 'operations' ? 'active' : ''}`} onClick={() => setActiveNav('operations')}>⚙️ Operations</button>
          <button className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`} onClick={() => setActiveNav('reports')}>📈 Reports</button>
        </nav>
        <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h2>Mess Overview</h2>
          <div className="date-filter">
            <input type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} className="date-input" />
            <select value={mealType} onChange={e => setMealType(e.target.value as MealType)} className="meal-select">
              {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        {activeNav === 'dashboard' && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <h4>Total Orders</h4>
                <p className="kpi-value">{headcount?.totalOrders || 0}</p>
                <p className="kpi-label">Booked for {formatDate(mealDate)}</p>
              </div>
              <div className="kpi-card served">
                <h4>Served</h4>
                <p className="kpi-value">{tokenSummary.served}</p>
                <p className="kpi-label">Tokens marked as served</p>
              </div>
              <div className="kpi-card pending">
                <h4>Pending</h4>
                <p className="kpi-value">{tokenSummary.pending}</p>
                <p className="kpi-label">Awaiting pickup</p>
              </div>
            </div>

            <section className="section">
              <h3 className="section-title">Production Breakdown</h3>
              {production.length === 0 ? <p className="empty-state">No data for this slot</p> : (
                <div className="production-grid">
                  {production.map((item, idx) => (
                    <div key={idx} className="production-card">
                      <div className="production-item">
                        <span className="production-label">Gravy:</span>
                        <span className="production-value">{item._id.base} + {item._id.topup}</span>
                      </div>
                      <div className="production-item">
                        <span className="production-label">Dry/Carbs:</span>
                        <span className="production-value">{item._id.dry} | {item._id.roti} Roti | {item._id.rice}</span>
                      </div>
                      <div className="production-item" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #EEE' }}>
                        <span className="production-label">Headcount:</span>
                        <span className="production-value" style={{ fontSize: '18px' }}>{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section">
              <h3 className="section-title">Live Token Feed</h3>
              <div className="tokens-table">
                <table>
                  <thead>
                    <tr><th>Token No</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {tokens.map(t => (
                      <tr key={t._id}>
                        <td className="token-cell">{t.tokenNo}</td>
                        <td><span className={`status-badge status-${t.status.toLowerCase()}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeNav === 'operations' && (
          <section className="section">
            <h3 className="section-title">Operations Console</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div className="operations-card">
                <h4>RFID Validation</h4>
                <p className="card-description">Scan student RFID card to mark meal as served.</p>
                <div className="rfid-input-group">
                  <input type="text" placeholder="Enter RFID..." value={rfid} onChange={e => setRfid(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleServeByRfid()} className="rfid-input" autoFocus />
                  <button onClick={handleServeByRfid} className="btn-primary">Serve Meal</button>
                </div>
                {scannedOrder && (
                  <div style={{ marginTop: '24px', padding: '20px', background: 'var(--primary)', color: 'white', borderRadius: '12px' }}>
                    <p style={{ fontWeight: 800, fontSize: '18px' }}>SUCCESS</p>
                    <p>Token: #{scannedOrder.tokenNo}</p>
                  </div>
                )}
              </div>

              <div className="assembly-card" style={{ background: '#F8F9FD', padding: '24px', borderRadius: '16px', border: '2px dashed #E2E8F0' }}>
                <h4>Assembly Checklist</h4>
                {!scannedOrder ? <p style={{ color: 'var(--text-light)', marginTop: '16px' }}>Scan a card to see selections...</p> : (
                  <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', opacity: 0.8 }}>ASSEMBLY CHECKLIST</p>
                    {Object.entries(scannedOrder.selections || {}).map(([k, v]) => {
                      const val = typeof v === 'object' && v !== null ? (v as any).id : v;
                      const portion = typeof v === 'object' && v !== null ? (v as any).portion : null;
                      return (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                          <span style={{ textTransform: 'uppercase', opacity: 0.7 }}>{k}:</span>
                          <span style={{ fontWeight: 700 }}>
                            {val} {portion && portion !== 'FULL' && <span style={{ background: '#F56565', padding: '1px 4px', borderRadius: '4px', fontSize: '10px', marginLeft: '4px' }}>{portion}</span>}
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(scannedOrder.selections || {}).length === 0 && <p>Standard Default Meal</p>}
                    <button className="outline-button" style={{ width: '100%', marginTop: '24px' }} onClick={() => setScannedOrder(null)}>Clear & Next</button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'reports' && (
          <section className="section">
            <h3 className="section-title">Detailed Reports</h3>
            <div className="production-grid">
              <div className="production-card" style={{ background: 'white' }}>
                <h4 style={{ marginBottom: '16px' }}>Headcount Analysis</h4>
                <p><strong>Date:</strong> {formatDate(mealDate)}</p>
                <p><strong>Meal:</strong> {mealType}</p>
                <p><strong>Total:</strong> {headcount?.totalOrders}</p>
              </div>
              <div className="production-card" style={{ background: 'white' }}>
                <h4 style={{ marginBottom: '16px' }}>Service Efficiency</h4>
                <p><strong>Served:</strong> {tokenSummary.served}</p>
                <p><strong>Pending:</strong> {tokenSummary.pending}</p>
                <p><strong>Rate:</strong> {headcount?.totalOrders ? Math.round((tokenSummary.served / headcount.totalOrders) * 100) : 0}%</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
