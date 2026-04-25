import { useEffect, useState } from 'react'
import { apiRequest } from './api'
import './index.css'

type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'
type NavSection = 'dashboard' | 'forecast' | 'materials' | 'operations' | 'reviews'

interface KPIStats {
  totalOrders: number
  servedCount: number
  revenue: number
  refunds: number
}

interface ForecastRow {
  _id: { date: string, type: string }
  totalOrders: number
  items: Array<{ name: string, count: number }>
}

interface Material {
  name: string
  amount: string
  unit: string
}

interface Review {
  _id: string
  studentId: { fullName: string, rollNo: string }
  messId: { name: string }
  rating: number
  ratingTaste: number
  ratingHygiene: number
  ratingWaitTime: number
  comment: string
  createdAt: string
}

const TOKEN_KEY = 'optimess.manager.token'
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']

function isoDateNow() {
  const d = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(d.getTime() + istOffset).toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [mealDate, setMealDate] = useState(isoDateNow())
  const [mealType, setMealType] = useState<MealType>('LUNCH')
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard')

  // Data States
  const [stats, setStats] = useState<KPIStats>({ totalOrders: 0, servedCount: 0, revenue: 0, refunds: 0 })
  const [forecast, setForecast] = useState<ForecastRow[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [detailedCounts, setDetailedCounts] = useState<Array<{ name: string, count: number }>>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [liveTokens, setLiveTokens] = useState<any[]>([])

  const [rfid, setRfid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [scannedOrder, setScannedOrder] = useState<any>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiRequest<{ accessToken?: string; token?: string }>('/auth/manager/login', {
        method: 'POST',
        body: { username, password },
      })
      const accessToken = res.accessToken ?? res.token
      if (!accessToken) throw new Error('Invalid credentials')

      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  async function loadDashboardData() {
    if (!token) return
    setLoading(true)
    try {
      const [headcount, revenue, tokens, production] = await Promise.all([
        apiRequest<any>(`/manager/dashboard/headcount?mealDate=${mealDate}&mealType=${mealType}`, { token }),
        apiRequest<any>(`/manager/revenue?mealDate=${mealDate}`, { token }),
        apiRequest<any>(`/manager/tokens/live?mealDate=${mealDate}&mealType=${mealType}`, { token }),
        apiRequest<any>(`/manager/production-plan?mealDate=${mealDate}&mealType=${mealType}`, { token })
      ])

      const revForType = revenue.revenueByMealType.find((r: any) => r._id === mealType)?.amount || 0

      setStats({
        totalOrders: headcount.totalOrders,
        servedCount: tokens.tokens.filter((t: any) => t.status === 'SERVED').length,
        revenue: revForType,
        refunds: revenue.refunds
      })
      setLiveTokens(tokens.tokens)
      setDetailedCounts(production.detailedCounts || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function loadForecast() {
    if (!token) return
    try {
      const res = await apiRequest<{ forecast: ForecastRow[] }>(`/manager/forecast?days=5`, { token })
      setForecast(res.forecast)
    } catch (err: any) { setError(err.message) }
  }

  async function loadMaterials() {
    if (!token) return
    try {
      const res = await apiRequest<{ materials: Material[] }>(`/manager/inventory/materials?mealDate=${mealDate}&mealType=${mealType}`, { token })
      setMaterials(res.materials)
    } catch (err: any) { setError(err.message) }
  }

  async function loadReviews() {
    if (!token) return
    try {
      const res = await apiRequest<Review[]>(`/manager/reviews/all`, { token })
      setReviews(res)
    } catch (err: any) { setError(err.message) }
  }

  useEffect(() => {
    if (!token) return
    if (activeNav === 'dashboard') loadDashboardData()
    if (activeNav === 'forecast') loadForecast()
    if (activeNav === 'materials') loadMaterials()
    if (activeNav === 'reviews') loadReviews()
  }, [token, activeNav, mealDate, mealType])

  async function handleServeRfid() {
    if (!token || !rfid) return
    try {
      const res = await apiRequest<any>('/manager/tokens/serve-by-rfid', {
        token, method: 'POST', body: { rfid, mealDate, mealType }
      })
      setMessage(`Successfully served Token #${res.tokenNo}`)
      setScannedOrder(res)
      setRfid('')
      loadDashboardData()
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">OptiManager</h1>
          <p className="login-subtitle">Secure Operations Access</p>
          <form onSubmit={handleLogin} className="login-form">
            <input type="text" placeholder="Manager ID" value={username} onChange={e => setUsername(e.target.value)} className="login-input" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="login-input" />
            <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Verifying...' : 'Access Portal'}</button>
          </form>
          {error && <div className="error-banner" style={{ marginTop: '20px' }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <header className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
          <span />
          <span />
          <span />
        </button>
        <h1 className="mobile-logo">OptiManager</h1>
        <div className="mobile-avatar" aria-hidden="true">{(username || 'M').slice(0, 1).toUpperCase()}</div>
      </header>
      <div className={`sidebar-backdrop ${mobileSidebarOpen ? 'show' : ''}`} onClick={() => setMobileSidebarOpen(false)} />
      <div className="workspace-shell">
        <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1 className="sidebar-logo">OptiManager</h1>
            <p className="sidebar-subtitle">Central Mess Command</p>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveNav('dashboard'); setMobileSidebarOpen(false) }}>Live Dashboard</button>
            <button className={`nav-item ${activeNav === 'forecast' ? 'active' : ''}`} onClick={() => { setActiveNav('forecast'); setMobileSidebarOpen(false) }}>Requirement Forecast</button>
            <button className={`nav-item ${activeNav === 'materials' ? 'active' : ''}`} onClick={() => { setActiveNav('materials'); setMobileSidebarOpen(false) }}>Kitchen Prep</button>
            <button className={`nav-item ${activeNav === 'operations' ? 'active' : ''}`} onClick={() => { setActiveNav('operations'); setMobileSidebarOpen(false) }}>Operations</button>
            <button className={`nav-item ${activeNav === 'reviews' ? 'active' : ''}`} onClick={() => { setActiveNav('reviews'); setMobileSidebarOpen(false) }}>Student Reviews</button>
          </nav>
          <div className="sidebar-note">
            <p>Kitchen Operations Suite</p>
            <small>Professional workspace for meal service planning and monitoring.</small>
          </div>
          <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} className="logout-btn">Terminate Session</button>
        </aside>

        <main className="main-content">
        <header className="top-bar">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{activeNav.toUpperCase()}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Monitoring {mealType} for {formatDate(mealDate)}</p>
          </div>
          <div className="date-filter">
            <input type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} className="date-input" />
            <select value={mealType} onChange={e => setMealType(e.target.value as MealType)} className="meal-select">
              {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        {activeNav === 'dashboard' && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <h4>Booked Headcount</h4>
                <p className="kpi-value">{stats.totalOrders}</p>
                <p className="kpi-label">Confirmed bookings</p>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
                <h4>Service Rate</h4>
                <p className="kpi-value" style={{ color: 'var(--success)' }}>{stats.totalOrders ? Math.round((stats.servedCount / stats.totalOrders) * 100) : 0}%</p>
                <p className="kpi-label">{stats.servedCount} meals served</p>
              </div>
              <div className="kpi-card">
                <h4>Est. Revenue</h4>
                <p className="kpi-value">₹{stats.revenue}</p>
                <p className="kpi-label">Current slot revenue</p>
              </div>
              <div className="kpi-card">
                <h4>Skip Liability</h4>
                <p className="kpi-value" style={{ color: 'var(--danger)' }}>₹{stats.refunds}</p>
                <p className="kpi-label">Refunded for leaves</p>
              </div>
            </div>

            <section className="section">
              <div className="dashboard-panels">
                <div className="production-card">
                  <h3 className="section-title">Master Preparation List</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Menu Item</th><th>Total Needed</th></tr></thead>
                      <tbody>
                        {detailedCounts.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{item.name.replace(/-/g, ' ')}</td>
                            <td style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '18px' }}>{item.count}</td>
                          </tr>
                        ))}
                        {detailedCounts.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', opacity: 0.5 }}>No items booked for this slot</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="production-card">
                  <h3 className="section-title">Live Token Feed</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Token</th><th>Status</th></tr></thead>
                      <tbody>
                        {liveTokens.slice(0, 50).map(t => (
                          <tr key={t._id}>
                            <td style={{ fontWeight: 800, color: 'var(--primary-light)' }}>#{t.tokenNo}</td>
                            <td><span className={`status-badge status-${t.status.toLowerCase()}`}>{t.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeNav === 'forecast' && (
          <div className="forecast-view">
            <h3 className="section-title">Detailed Multi-Day Requirement Forecast</h3>
            <div className="production-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
              {forecast.map((f, i) => (
                <div key={i} className="production-card" style={{ borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '18px' }}>{f._id.type}</strong>
                      <span className="pill-badge">{f.totalOrders} Pax</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{formatDate(f._id.date)}</p>
                  </div>
                  <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto' }}>
                    <table style={{ fontSize: '13px' }}>
                      <tbody>
                        {f.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px 0', textTransform: 'capitalize', color: 'var(--text-muted)' }}>{item.name.replace(/-/g, ' ')}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: 'var(--primary-light)' }}>{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {forecast.length === 0 && <p className="empty-state">No future bookings found.</p>}
            </div>
          </div>
        )}

        {activeNav === 'materials' && (
          <div className="materials-view">
            <h3 className="section-title">Detailed Raw Material Requirements</h3>
            <div className="materials-layout">
              <div className="production-card">
                <table>
                  <thead><tr><th>Ingredient</th><th>Required Quantity</th></tr></thead>
                  <tbody>
                    {materials.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '18px' }}>{m.amount} {m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="production-card" style={{ background: 'rgba(79, 70, 229, 0.05)', borderColor: 'var(--primary)' }}>
                <h4 style={{ marginBottom: '16px' }}>Requirement Estimation Logic</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Our system calculates weights based on confirmed bookings:<br /><br />
                  • <strong>Flour</strong>: Calculated per Roti (45g) and Paratha base.<br />
                  • <strong>Potatoes</strong>: Sourced for Samosas, Pav Bhaji, and Aloo-based mains.<br />
                  • <strong>Rice</strong>: Detailed for Biryani, Plain Rice, and Dosa batter.<br />
                  • <strong>Oil/Spices</strong>: Scaled based on total gravy portions.
                </p>
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-app)', borderRadius: '8px', fontSize: '11px', color: 'var(--accent)' }}>
                  <strong>Manager Tip</strong>: Always check 'Master Preparation List' for specific item counts.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'operations' && (
          <div className="ops-grid">
            <div className="rfid-box">
              <h2 style={{ fontSize: '28px', fontWeight: 900 }}>Scan Student RFID</h2>
              <p style={{ opacity: 0.8, marginTop: '8px' }}>Validate token and verify meal selections</p>
              <input
                type="text"
                value={rfid}
                onChange={e => setRfid(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleServeRfid()}
                placeholder="RFID T-ID..."
                className="rfid-input"
                autoFocus
              />
              <button
                onClick={handleServeRfid}
                className="serve-btn"
              >
                Manual Serve
              </button>
            </div>

            <div className="production-card">
              <h3 className="section-title">Assembly Guide</h3>
              {scannedOrder ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOKEN NO</p>
                    <p style={{ fontSize: '24px', fontWeight: 900 }}>#{scannedOrder.tokenNo}</p>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {Object.entries(scannedOrder.selections).map(([k, v]: any) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ fontWeight: 700 }}>{v.id || v} {v.portion && `(${v.portion})`}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setScannedOrder(null)} className="login-btn secondary-btn">Next Student</button>
                </div>
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '12px' }}>
                  Awaiting Scan...
                </div>
              )}
            </div>
          </div>
        )}

        {activeNav === 'reviews' && (
          <div className="review-view">
            <h3 className="section-title">Recent Student Feedback</h3>
            <div className="review-feed">
              {reviews.map(r => (
                <div key={r._id} className="review-card">
                  <div className="review-meta">
                    <div>
                      <strong style={{ fontSize: '16px' }}>{r.studentId.fullName}</strong>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.studentId.rollNo} - {formatDate(r.createdAt)}</p>
                    </div>
                    <div className="review-stars">Rating: {r.rating}/5</div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TASTE</p>
                      <p style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.ratingTaste}/5</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HYGIENE</p>
                      <p style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.ratingHygiene}/5</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SPEED</p>
                      <p style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.ratingWaitTime}/5</p>
                    </div>
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>"{r.comment || 'No comment provided'}"</p>
                </div>
              ))}
              {reviews.length === 0 && <p>No feedback received yet.</p>}
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  )
}
