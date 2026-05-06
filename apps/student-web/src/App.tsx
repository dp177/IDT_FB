import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'

type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'
type Portion = 'HALF' | 'FULL'
type Dietary = 'JAIN' | 'NON_JAIN'
type NavSection = 'home' | 'book' | 'history' | 'profile' | 'reviews' | 'leaves'

const DetailModal = ({ title, content, onClose }: { title: string; content: React.ReactNode; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
    <div className="panel-card" style={{ maxWidth: '500px', width: '90%', padding: '32px' }}>
      <h3 style={{ marginBottom: '16px' }}>{title}</h3>
      <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6 }}>{content}</div>
      <button className="primary-button" onClick={onClose} style={{ marginTop: '24px', width: '100%' }}>Close</button>
    </div>
  </div>
)

const ReviewModal = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: any) => void }) => {
  const [rating, setRating] = useState(5)
  const [taste, setTaste] = useState(5)
  const [hygiene, setHygiene] = useState(5)
  const [wait, setWait] = useState(5)
  const [comment, setComment] = useState('')

  const RatingRow = ({ label, value, onChange }: any) => (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ display: 'flex', gap: '8px', fontSize: '24px' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} onClick={() => onChange(s)} style={{ cursor: 'pointer', color: s <= value ? '#F6AD55' : '#E2E8F0' }}>★</span>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="panel-card" style={{ maxWidth: '450px', width: '90%', padding: '32px' }}>
        <h3 style={{ marginBottom: '8px' }}>Rate Your Meal</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>Your feedback helps us maintain the best quality standards.</p>

        <RatingRow label="Overall Satisfaction" value={rating} onChange={setRating} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <RatingRow label="Taste" value={taste} onChange={setTaste} />
          <RatingRow label="Hygiene" value={hygiene} onChange={setHygiene} />
        </div>
        <RatingRow label="Wait Time (Speed)" value={wait} onChange={setWait} />

        <textarea
          placeholder="Optional: Tell us more..."
          value={comment} onChange={e => setComment(e.target.value)}
          style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', fontSize: '14px' }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="outline-button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="primary-button" onClick={() => onSubmit({ rating, ratingTaste: taste, ratingHygiene: hygiene, ratingWaitTime: wait, comment })} style={{ flex: 1 }}>Submit</button>
        </div>
      </div>
    </div>
  )
}

type OrderStatus = 'BOOKED' | 'DEFAULTED' | 'SERVED' | 'SKIPPED' | string

interface StudentMe {
  rollNo: string
  fullName: string
  dietaryPreference: Dietary | null
  defaultSelections: Record<string, any> | null
  wallet: number
}

interface AvailabilityOption {
  messId: string
  name: string
  rating: number
  remaining: number
  capacity: number
  booked: number
}

interface AvailabilityResponse {
  options: AvailabilityOption[]
}

interface OrderItem {
  _id: string
  mealDate: string
  mealType: MealType
  status: OrderStatus
  tokenNo: string
  price: number
  isReviewed?: boolean
  selections: Record<string, any>
  portion: Portion
  createdAt: string
}

interface OrderHistoryResponse {
  orders: OrderItem[]
}

const StoryModal = ({ stories, initialIndex, onClose }: { stories: string[]; initialIndex: number; onClose: () => void }) => {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < stories.length - 1) {
        setIndex(index + 1)
      } else {
        onClose()
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [index, stories, onClose])

  const content = stories[index]
  if (!content) return null
  const [title, ...detailParts] = content.split(': ')
  const detail = detailParts.join(': ') || content

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.72)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)'
    }}>
      <div key={index} style={{
        width: 'min(92vw, 520px)', minHeight: '68vh', position: 'relative',
        background: 'linear-gradient(165deg, #5D5FEF 0%, #6D6FF2 50%, #7B50BD 100%)',
        padding: '28px 24px 30px', display: 'flex', flexDirection: 'column', textAlign: 'left', color: 'white',
        animation: 'slide-in 0.25s ease-out', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Progress Bars Container */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'white',
                width: i < index ? '100%' : i === index ? '0%' : '0%',
                animation: i === index ? 'story-progress 5s linear forwards' : 'none'
              }} />
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px', color: 'white', fontSize: '26px', lineHeight: 1,
          width: '42px', height: '42px', borderRadius: '9999px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)'
        }}>×</button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', letterSpacing: '1.2px', textTransform: 'uppercase', opacity: 0.82, fontWeight: 700 }}>
            Insight Brief
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 6vw, 56px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.5px' }}>{title}</h2>
          <p style={{ fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 700, lineHeight: 1.18 }}>{detail}</p>
          <p style={{ fontSize: '14px', opacity: 0.85, lineHeight: 1.55, maxWidth: '90%' }}>
            Tap to continue through insights. This view updates automatically in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ width: '52px', height: '52px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '13px', fontWeight: 800 }}>
            INS
          </div>
          <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.6px' }}>Insight {index + 1} of {stories.length}</p>
        </div>
      </div>
    </div>
  )
}

const ReviewsPanel = ({ orders, onRate, comparison, allReviews, loadingComp }: { orders: OrderItem[]; onRate: (id: string) => void; comparison: any[]; allReviews: any[]; loadingComp: boolean }) => {
  const unreviewed = orders.filter(o => o.status === 'SERVED' && !o.isReviewed)

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      {/* Comparison Section */}
      <div className="panel-card" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)', color: 'white' }}>
        <h2 style={{ color: 'white' }}>Mess Performance Comparison</h2>
        <p style={{ opacity: 0.9, marginBottom: '24px' }}>Compare average ratings across different timeframes.</p>

        <div className="history-table-wrap" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <table style={{ color: 'white' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <th style={{ color: 'white' }}>Mess Hall</th>
                <th style={{ color: 'white' }}>Taste</th>
                <th style={{ color: 'white' }}>Hygiene</th>
                <th style={{ color: 'white' }}>Speed</th>
                <th style={{ color: 'white' }}>Overall (Today)</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(c => (
                <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ fontWeight: 800 }}>{c.name}</td>
                  <td><span style={{ color: '#F6AD55' }}>★</span> {c.taste?.toFixed(1) || '0.0'}</td>
                  <td><span style={{ color: '#F6AD55' }}>★</span> {c.hygiene?.toFixed(1) || '0.0'}</td>
                  <td><span style={{ color: '#F6AD55' }}>★</span> {c.waitTime?.toFixed(1) || '0.0'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 900 }}>
                      <span style={{ color: '#F6AD55' }}>★</span> {c.today.toFixed(1)}
                      <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 400 }}>({c.todayCount})</span>
                    </div>
                  </td>
                </tr>
              ))}
              {loadingComp && <tr><td colSpan={5}>Loading comparison data...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>
        <div className="panel-card">
          <h2>Recent Feedback Feed</h2>
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {allReviews.map(r => (
              <div key={r._id} style={{ padding: '20px', background: '#F8F9FA', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>{r.messId?.name}</strong>
                    <span style={{ marginLeft: '12px', color: '#F6AD55' }}>{'★'.repeat(r.rating)}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: '8px 0', fontSize: '14px', fontStyle: 'italic' }}>"{r.comment || 'No comment provided'}"</p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>— {r.studentId?.fullName}</div>
              </div>
            ))}
            {allReviews.length === 0 && <p>No reviews yet. Be the first to rate!</p>}
          </div>
        </div>

        <div className="panel-card" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Pending Reviews</h3>
          {unreviewed.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {unreviewed.slice(0, 5).map(o => (
                <div key={o._id} style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #FFEDD5' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{o.mealType}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(o.mealDate)}</div>
                  <button className="primary-button" style={{ marginTop: '8px', width: '100%', padding: '6px', fontSize: '12px' }}
                    onClick={() => onRate(o._id)}>Rate Now</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No pending meals to rate. Enjoy your next meal!</p>
          )}
        </div>
      </div>
    </div>
  )
}

const LeaveRequestPanel = ({ token, onComplete, addToast }: { token: string; onComplete: () => void; addToast: (msg: string, type?: any) => void }) => {
  const tomorrow = addDays(isoDateNow(), 1)
  const [startDate, setStartDate] = useState(tomorrow)
  const [endDate, setEndDate] = useState(tomorrow)
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  const [isLoading, setIsLoading] = useState(false)

  const handleApply = async () => {
    setIsLoading(true)
    try {
      await apiRequest('/student/orders/skip/batch', {
        token, method: 'POST', body: { startDate, endDate, meals: selectedMeals, reason: 'Leave' }
      })
      addToast('Leave request processed successfully!', 'success')
      onComplete()
    } catch (err: any) { addToast(err.message, 'error') }
    finally { setIsLoading(false) }
  }

  return (
    <div className="panel-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '8px' }}>Plan Leave</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
        Going home or eating out? Mark your leave here. We'll cancel your auto-assignments for these dates.
      </p>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>FROM DATE</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #DDD' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>TO DATE</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #DDD' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>CANCEL THESE MEALS</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#F8F9FA', borderRadius: '10px', cursor: 'pointer', border: selectedMeals.includes(m) ? '2px solid var(--primary)' : '2px solid transparent' }}>
                <input type="checkbox" checked={selectedMeals.includes(m)}
                  onChange={e => e.target.checked ? setSelectedMeals(prev => [...prev, m]) : setSelectedMeals(prev => prev.filter(x => x !== m))} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{m}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="primary-button" onClick={handleApply} disabled={isLoading} style={{ marginTop: '16px', padding: '16px' }}>
          {isLoading ? 'Processing...' : 'Apply Leave Request'}
        </button>
      </div>
    </div>
  )
}

const TOKEN_KEY = 'optimess.student.token'
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']

const IMG = (name: string) => `/food/${name}`

interface MenuItem {
  id: string
  name: string
  desc: string
  price: number
  img: string
  veg: boolean
  badge?: string
  hasPortion?: boolean
}

interface MenuSection {
  label: string
  key: string
  items: MenuItem[]
}

// Hero banner image per meal type
const MEAL_IMAGES: Record<string, string> = {
  BREAKFAST: IMG('breakfast_menu_display_1776969595871.png'),
  LUNCH: IMG('lunch_dinner_menu_display_1776969613500.png'),
  SNACKS: IMG('snacks_menu_display_1776969638095.png'),
  DINNER: IMG('lunch_dinner_menu_display_1776969613500.png'),
}

// Full dynamic menu catalogue with prices and photos
const MENU_CATALOGUE: Record<string, MenuSection[]> = {
  BREAKFAST: [
    {
      label: 'Choose Your Main',
      key: 'main',
      items: [
        { id: '2-dosa', name: '2 Dosa', desc: 'Crispy rice crepes with coconut chutney & sambar', price: 40, img: IMG('dosa_crispy_1776971113959.png'), veg: true, badge: 'Popular' },
        { id: '4-vada', name: '4 Medu Vada', desc: 'Crispy urad dal fritters with sambar', price: 35, img: IMG('medu_vada_1776971130058.png'), veg: true },
        { id: '3-idli', name: '3 Idli', desc: 'Soft steamed rice cakes with sambar & chutney', price: 30, img: IMG('idli_plate_1776971147848.png'), veg: true, badge: 'Light' },
        { id: 'aloo-paratha', name: 'Aloo Paratha', desc: 'Spiced potato stuffed flatbread with butter', price: 50, img: IMG('aloo_paratha_1776971172887.png'), veg: true, badge: 'Chef Special' },
        { id: 'paneer-paratha', name: 'Paneer Paratha', desc: 'Cottage cheese stuffed paratha with curd', price: 65, img: IMG('paneer_paratha_1776971188925.png'), veg: true, badge: 'Premium' },
        { id: 'poha', name: 'Poha', desc: 'Flattened rice with mustard, turmeric & peanuts', price: 30, img: IMG('poha_bowl_1776971204987.png'), veg: true, badge: 'Light' },
        { id: 'pav-bhaji', name: 'Pav Bhaji', desc: 'Spiced vegetable mash with buttered buns', price: 55, img: IMG('pav_bhaji_1776971226502.png'), veg: true, badge: 'Popular' },
        { id: 'boiled-eggs', name: 'Boiled Eggs', desc: '2 protein-rich boiled eggs', price: 25, img: IMG('breakfast_menu_display_1776969595871.png'), veg: false, badge: 'High Protein' },
        { id: 'omelette', name: 'Omelette', desc: 'Fluffy 2-egg omelette with veggies', price: 30, img: IMG('breakfast_menu_display_1776969595871.png'), veg: false },
      ]
    },
    {
      label: 'Health Corner',
      key: 'health',
      items: [
        { id: 'sprouts', name: 'Sprouts', desc: 'Mixed sprouts salad, healthy & fresh', price: 20, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true, badge: 'Healthy' },
      ]
    },
    {
      label: 'Bakery',
      key: 'bakery',
      items: [
        { id: 'bread-butter', name: 'Bread Butter', desc: '4 slices of toasted bread with Amul butter', price: 25, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true },
        { id: 'bread-jam', name: 'Bread Jam', desc: '4 slices of bread with fruit jam', price: 25, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true },
      ]
    },
    {
      label: 'Beverage',
      key: 'beverage',
      items: [
        { id: 'b-tea', name: 'Tea', desc: 'Hot masala chai', price: 10, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true },
        { id: 'b-coffee', name: 'Coffee', desc: 'Hot brewed coffee', price: 15, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true },
        { id: 'b-bournvita', name: 'Bournvita', desc: 'Hot chocolate health drink', price: 20, img: IMG('breakfast_menu_display_1776969595871.png'), veg: true, badge: 'Health' },
      ]
    }
  ],
  LUNCH: [
    {
      label: 'Base Gravy',
      key: 'base',
      items: [
        { id: 'red-gravy', name: 'Red Gravy', desc: 'Rich tomato-onion base, medium spice', price: 15, img: IMG('paneer_gravy_1776971242349.png'), veg: true, badge: 'Classic', hasPortion: true },
        { id: 'yellow-gravy', name: 'Yellow/White Gravy', desc: 'Creamy cashew-yogurt base, mild', price: 20, img: IMG('paneer_gravy_1776971242349.png'), veg: true, badge: 'Mild', hasPortion: true },
      ]
    },
    {
      label: 'Top-up (Main Protein)',
      key: 'topup',
      items: [
        { id: 'paneer', name: 'Paneer', desc: 'Fresh cottage cheese cubes', price: 40, img: IMG('paneer_gravy_1776971242349.png'), veg: true, badge: 'Popular', hasPortion: true },
        { id: 'soya', name: 'Soya Chunks', desc: 'High protein soya in spiced gravy', price: 20, img: IMG('soya_chunks_curry_1776971256829.png'), veg: true, badge: 'High Protein', hasPortion: true },
        { id: 'kofta', name: 'Kofta', desc: 'Soft paneer & veggie dumplings', price: 35, img: IMG('kofta_curry_1776971277911.png'), veg: true, hasPortion: true },
        { id: 'chhole', name: 'Chhole', desc: 'Spiced Punjabi chickpea masala', price: 25, img: IMG('chhole_masala_1776971292524.png'), veg: true, badge: 'Spicy', hasPortion: true },
      ]
    },
    {
      label: 'Dry Curry',
      key: 'dry',
      items: [
        { id: 'aloo-fry', name: 'Aloo Fry', desc: 'Crispy stir-fried potatoes', price: 15, img: IMG('lunch_dinner_menu_display_1776969613500.png'), veg: true, hasPortion: true },
        { id: 'matar-aloo', name: 'Matar Aloo', desc: 'Peas & potato in light gravy', price: 20, img: IMG('lunch_dinner_menu_display_1776969613500.png'), veg: true, hasPortion: true },
        { id: 'mix-veg', name: 'Mix Veg', desc: 'Seasonal vegetables sauteed', price: 20, img: IMG('lunch_dinner_menu_display_1776969613500.png'), veg: true, badge: 'Fresh', hasPortion: true },
        { id: 'jeera-aloo', name: 'Jeera Aloo', desc: 'Cumin-tempered potatoes', price: 15, img: IMG('lunch_dinner_menu_display_1776969613500.png'), veg: true, hasPortion: true },
        { id: 'bhindi', name: 'Bhindi Masala', desc: 'Stir-fried okra with spices', price: 25, img: IMG('lunch_dinner_menu_display_1776969613500.png'), veg: true, hasPortion: true },
      ]
    },
    {
      label: 'Dals',
      key: 'dal',
      items: [
        { id: 'dal-fry', name: 'Dal Fry', desc: 'Yellow lentils tempered with garlic & cumin', price: 15, img: IMG('chhole_masala_1776971292524.png'), veg: true, badge: 'Classic', hasPortion: true },
        { id: 'dal-makhani', name: 'Dal Makhani', desc: 'Slow-cooked black lentils with cream', price: 25, img: IMG('chhole_masala_1776971292524.png'), veg: true, badge: 'Popular', hasPortion: true },
        { id: 'dal-tadka', name: 'Dal Tadka', desc: 'Arhar dal with red chilli tadka', price: 15, img: IMG('chhole_masala_1776971292524.png'), veg: true, hasPortion: true },
        { id: 'rajma', name: 'Rajma', desc: 'Red kidney beans in thick gravy', price: 20, img: IMG('chhole_masala_1776971292524.png'), veg: true, badge: 'Hearty', hasPortion: true },
        { id: 'panchmel', name: 'Panchmel Dal', desc: 'Traditional five-lentil mix', price: 20, img: IMG('chhole_masala_1776971292524.png'), veg: true, hasPortion: true },
      ]
    },
  ],
  SNACKS: [
    {
      label: 'Hot Bite',
      key: 'hot',
      items: [
        { id: 'samosa', name: 'Samosa', desc: '2 crispy samosas with chutney', price: 20, img: IMG('samosa_plate_1776971310265.png'), veg: true, badge: 'Popular' },
        { id: 'kachori', name: 'Kachori', desc: '2 flaky kachoris with aloo sabzi', price: 25, img: IMG('kachori_snack_1776971332501.png'), veg: true },
        { id: 'sandwich', name: 'Sandwich', desc: 'Toasted veg sandwich with green chutney', price: 35, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'patty', name: 'Patty (Puff)', desc: 'Crispy baked pastry puff', price: 20, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'veg-burger', name: 'Veg Burger', desc: 'Crispy patty with lettuce & sauce', price: 45, img: IMG('veg_burger_1776971347546.png'), veg: true, badge: 'New' },
      ]
    },
    {
      label: 'Beverage',
      key: 'beverage',
      items: [
        { id: 'tea', name: 'Tea', desc: 'Hot masala chai', price: 10, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'coffee', name: 'Coffee', desc: 'Hot brewed coffee', price: 15, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'bournvita', name: 'Bournvita', desc: 'Hot chocolate health drink', price: 20, img: IMG('snacks_menu_display_1776969638095.png'), veg: true, badge: 'Health' },
        { id: 'cold-coffee', name: 'Cold Coffee', desc: 'Chilled coffee with milk', price: 30, img: IMG('snacks_menu_display_1776969638095.png'), veg: true, badge: 'Cold' },
        { id: 'shikanji', name: 'Shikanji', desc: 'Fresh lime soda with spices', price: 20, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'milkrose', name: 'Milkrose', desc: 'Chilled rose milk drink', price: 25, img: IMG('snacks_menu_display_1776969638095.png'), veg: true },
        { id: 'shake', name: 'Shakes', desc: 'Seasonal flavoured milkshake', price: 40, img: IMG('snacks_menu_display_1776969638095.png'), veg: true, badge: 'Popular' },
      ]
    }
  ],
  DINNER: [],  // Mirrors LUNCH
}
// Dinner mirrors Lunch
MENU_CATALOGUE.DINNER = MENU_CATALOGUE.LUNCH

const CARB_PRICES: Record<string, number> = {
  '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30, '7': 35, '8': 40,
  'Plain Rice': 10, 'Jeera Rice': 15, 'No Rice': 0,
}

function getDalForDay(dateStr: string, type: string): string {
  const day = new Date(`${dateStr}T00:00:00`).getDay() // 0=Sun, 1=Mon...
  const schedule: Record<number, { LUNCH: string, DINNER: string }> = {
    1: { LUNCH: 'dal-fry', DINNER: 'dal-makhani' }, // Using IDs from catalogue
    2: { LUNCH: 'dal-tadka', DINNER: 'panchmel' },
    3: { LUNCH: 'dal-fry', DINNER: 'rajma' },
    4: { LUNCH: 'dal-makhani', DINNER: 'dal-tadka' },
    5: { LUNCH: 'panchmel', DINNER: 'dal-fry' },
    6: { LUNCH: 'rajma', DINNER: 'panchmel' },
    0: { LUNCH: 'dal-fry', DINNER: 'dal-makhani' }
  }
  return schedule[day]?.[type as 'LUNCH' | 'DINNER'] || 'dal-fry'
}
function isoDateNow() {
  const d = new Date()
  // Offset for IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(d.getTime() + istOffset)
  return istDate.toISOString().slice(0, 10)
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`) // Parse as UTC to avoid local timezone issues
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [rollNo, setRollNo] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [hostel, setHostel] = useState('')
  const [department, setDepartment] = useState('')
  const [student, setStudent] = useState<StudentMe | null>(null)
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [availability, setAvailability] = useState<AvailabilityOption[]>([])
  const [, setOnboardingStep] = useState(1)
  const [loadingComp, setLoadingComp] = useState(false)

  const generateInsights = () => {
    if (!comparison.length) return ['No comparison data available yet. Submit reviews to unlock insights.']

    const topTaste = [...comparison].sort((a, b) => b.taste - a.taste)[0]
    const topHygiene = [...comparison].sort((a, b) => b.hygiene - a.hygiene)[0]
    const topSpeed = [...comparison].sort((a, b) => b.waitTime - a.waitTime)[0]
    const topToday = [...comparison].sort((a, b) => b.today - a.today)[0]
    const topMonthly = [...comparison].sort((a, b) => b.month - a.month)[0]

    const rules = [
      () => topTaste?.taste > 0 ? `Taste Leader: ${topTaste.name} has the highest taste score today (${topTaste.taste.toFixed(1)}).` : null,
      () => topHygiene?.hygiene > 0 ? `Hygiene Leader: ${topHygiene.name} leads current cleanliness ratings.` : null,
      () => topSpeed?.waitTime > 0 ? `Service Speed Leader: ${topSpeed.name} has the strongest speed rating.` : null,
      () => topToday ? `Overall Leader: ${topToday.name} holds the highest overall score today.` : null,
      () => topMonthly ? `Monthly Consistency: ${topMonthly.name} is leading the 30-day performance view.` : null,
      () => comparison.length > 1 ? `Comparison Update: ${comparison.length} active mess options are currently ranked.` : null,
      () => `Planning Tip: Review taste, hygiene, and speed together before placing your next booking.`,
      () => `Operational Note: Ratings refresh continuously as new feedback is submitted.`,
      () => `Decision Support: Use current ranking and review volume to compare service quality.`,
      () => `Service Benchmark: High-performing messes maintain balance across taste, hygiene, and speed.`,
    ]

    // Shuffle and pick 10
    const shuffled = rules
      .map(r => { try { return r() } catch { return null } })
      .filter(x => x !== null)
      .sort(() => Math.random() - 0.5)

    return shuffled.slice(0, 10)
  }

  const [selectedDate, setSelectedDate] = useState(addDays(isoDateNow(), 1))
  const [selectedMeal, setSelectedMeal] = useState<MealType>('LUNCH')
  const [selectedPortion] = useState<Portion>('FULL')
  const [selectedMess, setSelectedMess] = useState('')
  const [selections, setSelections] = useState<Record<string, { id: string, portion: Portion }>>({})
  const [activeNav, setActiveNav] = useState<NavSection>('home')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([])
  const [tempDefaultMenu, setTempDefaultMenu] = useState<Record<string, any>>({
    rotiCount: { id: '2', portion: 'FULL' },
    rice: { id: 'Plain Rice', portion: 'FULL' },
    dal: { id: 'dal-fry', portion: 'FULL' }
  })
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null)
  const [detailInfo, setDetailInfo] = useState<{ title: string; content: React.ReactNode } | null>(null)
  const [historyFilter, setHistoryFilter] = useState<string>('ALL')
  const [comparison, setComparison] = useState<any[]>([])
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  const dashboardInsights = useMemo(() => generateInsights(), [comparison, allReviews])

  const daysInWindow = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(isoDateNow(), i + 1)),
    []
  )

  const stats = useMemo(() => {
    const booked = orders.filter((o) => o.status === 'BOOKED' || o.status === 'DEFAULTED').length
    const served = orders.filter((o) => o.status === 'SERVED').length
    const skipped = orders.filter((o) => o.status === 'SKIPPED').length
    return { booked, served, skipped, total: orders.length }
  }, [orders])

  const upcomingOrder = useMemo(() => {
    return [...orders]
      .filter((o) => o.mealDate >= isoDateNow() && o.status !== 'SKIPPED')
      .sort((a, b) => a.mealDate.localeCompare(b.mealDate))[0]
  }, [orders])


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await apiRequest<{ accessToken?: string; token?: string }>('/auth/student/login', {
        method: 'POST',
        body: { rollNo, password },
      })
      const accessToken = res.accessToken ?? res.token
      if (!accessToken) throw new Error('Invalid response from server')
      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      addToast('Logged in successfully!', 'success')
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await apiRequest<{ accessToken?: string; token?: string }>('/auth/student/register', {
        method: 'POST',
        body: {
          rollNo,
          password,
          fullName,
          hostel,
          department,
        },
      })
      const accessToken = res.accessToken ?? res.token
      if (!accessToken) throw new Error('Invalid response from server')
      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      addToast('Registration completed successfully!', 'success')
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  function addToast(msg: string, type: 'success' | 'error' = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message: msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  async function loadData() {
    if (!token) return
    try {
      const [profile, history] = await Promise.all([
        apiRequest<StudentMe>('/student/me', { token }),
        apiRequest<OrderHistoryResponse>('/student/orders/history', { token })
      ])
      setStudent(profile)
      setOrders(history.orders ?? [])
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (!token) return
    setLoadingComp(true)
    apiRequest<StudentMe>('/student/me', { token }).then(setStudent).catch(e => addToast(e.message, 'error'))
    apiRequest<OrderHistoryResponse>('/student/orders/history', { token }).then(res => setOrders(res.orders)).catch(e => addToast(e.message, 'error'))
    apiRequest<any[]>('/student/reviews/all', { token }).then(setAllReviews).catch(e => addToast(e.message, 'error'))
    apiRequest<any[]>('/student/reviews/comparison', { token }).then(res => {
      setComparison(res)
      setLoadingComp(false)
    }).catch(e => {
      addToast(e.message, 'error')
      setLoadingComp(false)
    })
  }, [token])

  async function loadAvailability() {
    if (!token) return
    setIsAvailabilityLoading(true)
    try {
      const data = await apiRequest<AvailabilityResponse>(
        `/student/messes/availability?mealDate=${selectedDate}&mealType=${selectedMeal}`,
        { token }
      )
      setAvailability(data.options ?? [])
      if (data.options?.length > 0 && !data.options.some(o => o.messId === selectedMess)) {
        setSelectedMess(data.options[0].messId)
      }
    } catch (err: any) {
      console.error('Failed to load availability:', err)
      addToast(`Messes: ${err.message}`, 'error')
    } finally {
      setIsAvailabilityLoading(false)
    }
  }

  useEffect(() => { if (token) loadData(); }, [token])
  useEffect(() => { if (token) loadAvailability(); }, [token, selectedDate, selectedMeal])

  async function handleSetDietary(pref: Dietary) {
    if (!token) return
    try {
      await apiRequest('/student/preferences/dietary', {
        token, method: 'POST', body: { dietaryPreference: pref }
      })
      addToast(`Preference set to ${pref}`, 'success')
      await loadData()
    } catch (err: any) { addToast(err.message, 'error') }
  }

  async function handleSetDefaultMenu() {
    if (!token) return
    setIsLoading(true)
    try {
      await apiRequest('/student/preferences/default-menu', {
        token, method: 'POST', body: { defaultSelections: tempDefaultMenu }
      })
      addToast('Default menu saved!', 'success')
      await loadData()
      setOnboardingStep(1)
    } catch (err: any) { addToast(err.message, 'error') }
    finally { setIsLoading(false) }
  }

  async function handleBook() {
    if (!token || !selectedMess) return
    setIsLoading(true)
    try {
      await apiRequest('/student/orders', {
        token, method: 'POST', body: {
          mealDate: selectedDate,
          mealType: selectedMeal,
          messId: selectedMess,
          portion: selectedPortion,
          selections
        }
      })
      addToast('Meal booked successfully!', 'success')
      await loadData()
      setActiveNav('history')
    } catch (err: any) { addToast(err.message, 'error') }
    finally { setIsLoading(false) }
  }

  const handleReviewSubmit = async (orderId: string, data: any) => {
    try {
      await apiRequest(`/student/orders/${orderId}/review`, {
        token: token ?? undefined, method: 'POST', body: data
      })
      addToast('Review submitted! Thank you.', 'success')
      // Refresh
      apiRequest<OrderHistoryResponse>('/student/orders/history', { token: token ?? undefined }).then(res => setOrders(res.orders))
      apiRequest<any[]>('/student/reviews/comparison', { token: token ?? undefined }).then(setComparison)
    } catch (err: any) { addToast(err.message, 'error') }
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-glow" />
        <div className="auth-card">
          <p className="auth-eyebrow">Optimess Platform</p>
          <h1>{authMode === 'login' ? 'Welcome Back' : 'Student Registration'}</h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Log in to manage your daily meals and wallet.'
              : 'Create your account first, then complete the Jain or Not Jain setup on first login.'}
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setAuthMode('login')}
              style={{ flex: 1, opacity: authMode === 'login' ? 1 : 0.72 }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="outline-button"
              onClick={() => setAuthMode('register')}
              style={{ flex: 1, opacity: authMode === 'register' ? 1 : 0.72 }}
            >
              Register
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
            {authMode === 'register' && (
              <>
                <label className="field-group">
                  <span>Full Name</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Student name" required />
                </label>
                <label className="field-group">
                  <span>Hostel</span>
                  <input type="text" value={hostel} onChange={e => setHostel(e.target.value)} placeholder="Hostel name" required />
                </label>
                <label className="field-group">
                  <span>Department</span>
                  <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" required />
                </label>
              </>
            )}
            <label className="field-group">
              <span>Roll Number</span>
              <input type="text" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="e.g. 23BCE1234" required />
            </label>
            <label className="field-group">
              <span>Password</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </label>
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? (authMode === 'login' ? 'Signing in...' : 'Creating account...') : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (student && (!student.dietaryPreference || !student.defaultSelections)) {
    if (!student.dietaryPreference) {
      return (
        <div className="auth-shell">
          <div className="auth-card">
            <p className="auth-eyebrow">Setup Step 1/2</p>
            <h1>Dietary Preference</h1>
            <p className="auth-subtitle">This helps us customize your menu options.</p>
            <div className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div onClick={() => handleSetDietary('JAIN')} className="diet-option-card">
                <div style={{ fontSize: '24px', marginBottom: '12px', fontWeight: 700 }}>J</div>
                <h4 style={{ fontWeight: 800 }}>JAIN</h4>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>No Onion/Garlic</p>
              </div>
              <div onClick={() => handleSetDietary('NON_JAIN')} className="diet-option-card">
                <div style={{ fontSize: '24px', marginBottom: '12px', fontWeight: 700 }}>R</div>
                <h4 style={{ fontWeight: 800 }}>REGULAR</h4>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>All standard items</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Step 2: Full Default Menu Setup
    return (
      <div className="auth-shell" style={{ background: '#F0F2F5', padding: '40px 20px' }}>
        <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'left', padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #EEE', paddingBottom: '20px' }}>
            <div>
              <p className="auth-eyebrow">Setup Step 2/2</p>
              <h1 style={{ margin: 0 }}>Create Your Default Meal</h1>
              <p className="auth-subtitle" style={{ margin: '8px 0 0 0' }}>Configure your fallback menu. If you miss a booking, we'll auto-order this for you.</p>
            </div>
            <button className="primary-button" onClick={handleSetDefaultMenu} disabled={isLoading} style={{ padding: '12px 32px' }}>
              {isLoading ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>
            {/* Breakfast Defaults */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Breakfast Default
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {MENU_CATALOGUE.BREAKFAST.map(section => (
                  <div key={section.key}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>{section.label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {section.items.map(item => {
                        const isSelected = tempDefaultMenu[section.key]?.id === item.id
                        return (
                          <div key={item.id}
                            onClick={() => setTempDefaultMenu(prev => {
                              const next = { ...prev }
                              if (isSelected) delete next[section.key]
                              else next[section.key] = { id: item.id, portion: 'FULL' }
                              return next
                            })}
                            style={{
                              padding: '12px', borderRadius: '12px', border: isSelected ? '2px solid var(--primary)' : '1.5px solid #E2E8F0',
                              background: isSelected ? '#F8F7FF' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                            <img src={item.img} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lunch/Dinner Defaults */}
            <div style={{ borderLeft: '1px solid #EEE', paddingLeft: '40px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Lunch/Dinner Default
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {MENU_CATALOGUE.LUNCH.map(section => (
                  <div key={section.key}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>{section.label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {section.items.map(item => {
                        const sel = tempDefaultMenu[section.key]
                        const isSelected = sel?.id === item.id
                        return (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div onClick={() => setTempDefaultMenu(prev => {
                              const next = { ...prev }
                              if (isSelected) delete next[section.key]
                              else next[section.key] = { id: item.id, portion: 'FULL' }
                              return next
                            })}
                              style={{
                                padding: '12px', borderRadius: '12px', border: isSelected ? '2px solid var(--primary)' : '1.5px solid #E2E8F0',
                                background: isSelected ? '#F8F7FF' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                              }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={item.img} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.name}</span>
                              </div>
                              {isSelected && <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px' }}>✓ Selected</span>}
                            </div>
                            {isSelected && item.hasPortion && (
                              <div style={{ display: 'flex', gap: '6px', marginLeft: '52px' }}>
                                {['HALF', 'FULL'].map(p => (
                                  <button key={p} onClick={() => setTempDefaultMenu(prev => ({ ...prev, [section.key]: { id: item.id, portion: p } }))}
                                    style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, background: sel.portion === p ? 'var(--primary)' : '#EEE', color: sel.portion === p ? 'white' : 'black', border: 'none' }}>
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Roti & Rice */}
                <div style={{ padding: '20px', background: '#F8F9FA', borderRadius: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Carbs (Roti & Rice)</p>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Roti: </span>
                      <select value={tempDefaultMenu.rotiCount?.id || '2'} onChange={e => setTempDefaultMenu(p => ({ ...p, rotiCount: { id: e.target.value, portion: 'FULL' } }))} style={{ padding: '4px 8px', borderRadius: '6px' }}>
                        {['1', '2', '3', '4', '5', '6', '7', '8'].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Rice: </span>
                      <select value={tempDefaultMenu.rice?.id || 'Plain Rice'} onChange={e => setTempDefaultMenu(p => ({ ...p, rice: { id: e.target.value, portion: 'FULL' } }))} style={{ padding: '4px 8px', borderRadius: '6px' }}>
                        {['Plain Rice', 'Jeera Rice', 'No Rice'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (token && !student) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F7F8FC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--grad-primary)', borderRadius: '12px', margin: '0 auto 16px', animation: 'pulse 2s infinite' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="portal-bg">
        <div className="mobile-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <div className="mobile-logo">Coursue</div>
          <div className="mobile-avatar">{(student?.fullName || 'S').slice(0, 1).toUpperCase()}</div>
        </div>
        <div className={`mobile-overlay ${mobileSidebarOpen ? 'show' : ''}`} onClick={() => setMobileSidebarOpen(false)} />
        <div className="portal-shell">
          <aside className={`portal-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
            <div className="brand-wrap">
              <div className="brand-orb" />
              <div>
                <div className="brand-name">Optimess</div>
                <div className="brand-role">Student Portal</div>
              </div>
            </div>
            <nav className="sidebar-nav">
              <button className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} onClick={() => { setActiveNav('home'); setMobileSidebarOpen(false) }}>Dashboard</button>
              <button className={`nav-item ${activeNav === 'book' ? 'active' : ''}`} onClick={() => { setActiveNav('book'); setMobileSidebarOpen(false) }}>Book Meal</button>
              <button className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={() => { setActiveNav('history'); setMobileSidebarOpen(false) }}>History</button>
              <button className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`} onClick={() => { setActiveNav('profile'); setMobileSidebarOpen(false) }}>Profile</button>
              <button className={`nav-item ${activeNav === 'reviews' ? 'active' : ''}`} onClick={() => { setActiveNav('reviews'); setMobileSidebarOpen(false) }}>Mess Reviews</button>
              <button className={`nav-item ${activeNav === 'leaves' ? 'active' : ''}`} onClick={() => { setActiveNav('leaves'); setMobileSidebarOpen(false) }}>Leave Requests</button>
            </nav>
            <button className="logout-btn" onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }}>Logout</button>
          </aside>

          <main className="portal-main">
            <header className="main-toolbar">
              <div>
                <p className="toolbar-eyebrow">Overview</p>
                <h1>{getGreeting()}, {(student?.fullName || 'Student').split(' ')[0]}</h1>
                <p className="toolbar-subline">Track your meals and upcoming tokens</p>
              </div>
              <div className="toolbar-controls">
                <div className="wallet-chip">Wallet <strong>Rs. {student?.wallet}</strong></div>
                <button className="primary-button" onClick={() => setActiveNav('book')}>+ Book Now</button>
              </div>
            </header>

            {activeNav === 'home' && (
              <div className="dashboard-stack">
                <div className="insight-strip">
                  {dashboardInsights?.map((ins, i) => {
                    const [title, ...rest] = ins.split(': ')
                    const detail = rest.join(': ') || 'Tap to view details'
                    return (
                      <button key={i} onClick={() => setActiveStoryIndex(i)} className="insight-chip" type="button">
                        <div className="insight-chip-badge">I{i + 1}</div>
                        <div className="insight-chip-copy">
                          <span className="insight-chip-title">{title || 'Insight'}</span>
                          <span className="insight-chip-detail">{detail}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <section className="hero-card">
                  <div>
                    <p className="hero-kicker">Live Updates</p>
                    <h2>Never miss a meal again. <br />Check your upcoming tokens.</h2>
                    <p className="hero-description">Your next meal is planned for {upcomingOrder ? formatDate(upcomingOrder.mealDate) : '...loading'}.</p>
                    <div className="hero-actions">
                      <button className="primary-button" onClick={() => setActiveNav('book')}>Book Now</button>
                      <button className="outline-button" onClick={() => setActiveNav('history')}>View History</button>
                    </div>
                  </div>
                </section>

                <div className="stats-grid">
                  <div className="stats-card" style={{ cursor: 'pointer' }} onClick={() => {
                    setHistoryFilter('ALL')
                    setActiveNav('history')
                  }}>
                    <p>Total Bookings</p>
                    <h3>{stats.total}</h3>
                    <span>Total meals booked so far</span>
                  </div>
                  <div className="stats-card" style={{ cursor: 'pointer' }} onClick={() => {
                    setHistoryFilter('SERVED')
                    setActiveNav('history')
                  }}>
                    <p>Meals Served</p>
                    <h3>{stats.served}</h3>
                    <span>Successfully picked up</span>
                  </div>
                  <div className="stats-card" style={{ cursor: 'pointer' }} onClick={() => {
                    setHistoryFilter('UPCOMING')
                    setActiveNav('history')
                  }}>
                    <p>Upcoming</p>
                    <h3>{stats.booked}</h3>
                    <span>Tokens ready for use</span>
                  </div>
                  <div className="stats-card" style={{ cursor: 'pointer' }} onClick={() => {
                    setHistoryFilter('SKIPPED')
                    setActiveNav('history')
                  }}>
                    <p>Skipped</p>
                    <h3>{stats.skipped}</h3>
                    <span>Refunded to wallet</span>
                  </div>
                </div>


                <div className="insight-grid">
                  <div className="panel-card" style={{ cursor: 'pointer' }} onClick={() => {
                    if (!upcomingOrder) return;
                    setDetailInfo({
                      title: `Token Details: ${upcomingOrder.mealType}`,
                      content: (
                        <div>
                          <div style={{ fontSize: '32px', fontWeight: 900, textAlign: 'center', margin: '20px 0', color: 'var(--primary)', letterSpacing: '4px' }}>#{upcomingOrder.tokenNo}</div>
                          <div style={{ display: 'grid', gap: '8px', padding: '16px', background: '#F8F9FA', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mess</span><strong>Mess Hall</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span><strong>{formatDate(upcomingOrder.mealDate)}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Portion</span><strong>{upcomingOrder.portion}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEE', paddingTop: '8px', marginTop: '4px' }}><span>Items</span><strong style={{ textAlign: 'right' }}>{Object.values(upcomingOrder.selections).map((s: any) => s.id).join(', ')}</strong></div>
                          </div>
                        </div>
                      )
                    })
                  }}>
                    <h3>Next Token</h3>
                    {upcomingOrder ? (
                      <div style={{ background: '#F8F7FF', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <strong style={{ fontSize: '18px' }}>{upcomingOrder.mealType}</strong>
                          <span className="token-no">#{upcomingOrder.tokenNo}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)' }}>{formatDate(upcomingOrder.mealDate)}</p>
                      </div>
                    ) : <p className="text-light">No upcoming meals found.</p>}
                  </div>
                  <div className="panel-card">
                    <h3>Recent Activity</h3>
                    <div className="history-table-wrap">
                      <table>
                        <tbody>
                          {orders.slice(0, 3).map(o => (
                            <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => setDetailInfo({
                              title: `Order Summary: ${o.mealType}`,
                              content: (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Price</span><strong>Rs. {o.price}</strong></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Selections</span><strong style={{ textAlign: 'right' }}>{Object.values(o.selections).map((s: any) => s.id).join(', ')}</strong></div>
                                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Ordered on {new Date(o.createdAt).toLocaleString()}</p>
                                </div>
                              )
                            })}>
                              <td>{formatDate(o.mealDate)}</td>
                              <td><strong>{o.mealType}</strong></td>
                              <td><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'book' && (() => {
              // Compute dynamic price from selections
              const sections = MENU_CATALOGUE[selectedMeal] || []
              let livePrice = 0
              sections.forEach(sec => {
                const sel = selections[sec.key]
                if (sel) {
                  const item = sec.items.find(i => i.id === sel.id)
                  if (item) {
                    const basePrice = item.price
                    livePrice += sel.portion === 'HALF' ? Math.round(basePrice * 0.7) : basePrice
                  }
                }
              })
              if (selections.rotiCount) livePrice += CARB_PRICES[selections.rotiCount.id] || 0
              if (selections.rice) {
                const rPrice = CARB_PRICES[selections.rice.id] || 0
                livePrice += selections.rice.portion === 'HALF' ? Math.round(rPrice * 0.7) : rPrice
              }

              const MenuItemCard = ({ item, sectionKey }: { item: MenuItem; sectionKey: string }) => {
                const sel = selections[sectionKey]
                const isSelected = sel?.id === item.id
                const portion = sel?.portion || 'FULL'

                return (
                  <div
                    style={{
                      display: 'flex', gap: '16px', padding: '16px',
                      borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid var(--primary)' : '2px solid #F1F2F6',
                      background: isSelected ? '#F8F7FF' : 'white',
                      boxShadow: isSelected ? '0 4px 20px rgba(108,92,231,0.12)' : 'none',
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                    }}
                    onClick={() => setSelections(s => {
                      const newS = { ...s }
                      if (newS[sectionKey]?.id === item.id) {
                        delete newS[sectionKey]
                      } else {
                        newS[sectionKey] = { id: item.id, portion: 'FULL' }
                      }
                      return newS
                    })}
                  >
                    <img
                      src={item.img} alt={item.name}
                      style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              border: `2px solid ${item.veg ? '#38A169' : '#E53E3E'}`,
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.veg ? '#38A169' : '#E53E3E' }} />
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>{item.name}</span>
                            {item.badge && <span style={{ fontSize: '10px', background: '#EBF4FF', color: '#3182CE', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>{item.badge}</span>}
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{item.desc}</p>

                          {isSelected && item.hasPortion && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }} onClick={e => e.stopPropagation()}>
                              {['HALF', 'FULL'].map(p => (
                                <button key={p}
                                  onClick={() => setSelections(s => ({ ...s, [sectionKey]: { id: item.id, portion: p as any } }))}
                                  style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                                    border: portion === p ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                                    background: portion === p ? 'var(--primary)' : 'white',
                                    color: portion === p ? 'white' : 'var(--text-main)',
                                  }}>
                                  {p}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                            Rs. {portion === 'HALF' ? Math.round(item.price * 0.7) : item.price}
                          </div>
                          {isSelected && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>✓ Selected</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div className="booking-experience">

                  {/* Date Scroller */}
                  <div className="date-scroller" style={{ marginBottom: '24px' }}>
                    {daysInWindow.map(d => (
                      <button key={d} className={`date-chip ${selectedDate === d ? 'active' : ''}`} onClick={() => setSelectedDate(d)}>
                        <span>{formatDate(d).split(',')[0]}</span>
                        <small>{d.split('-').slice(1).reverse().join('/')}</small>
                      </button>
                    ))}
                  </div>

                  {/* Meal Type Selector */}
                  <div className="meal-visual-grid" style={{ marginBottom: '40px' }}>
                    {MEAL_TYPES.map(m => (
                      <div key={m} className={`meal-card ${selectedMeal === m ? 'active' : ''}`}
                        onClick={() => { setSelectedMeal(m); setSelections({}) }}>
                        <img src={MEAL_IMAGES[m]} alt={m} />
                        <div className="meal-overlay">
                          <span className="meal-name">{m}</span>
                          <span className="meal-price">
                            {m === 'BREAKFAST' ? 'From Rs. 20' : m === 'SNACKS' ? 'From Rs. 10' : 'From Rs. 30'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mess Picker */}
                  <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Select a Mess</h2>
                      {selectedMess && <span style={{ fontSize: '12px', background: '#F0FFF4', color: '#38A169', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>✓ Selected</span>}
                    </div>
                    {availability.length === 0 ? (
                      <div style={{ padding: '30px', background: '#F8F7FF', borderRadius: '16px', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed #D1D5DB' }}>
                        <p style={{ fontSize: '15px', marginBottom: '12px' }}>
                          {isAvailabilityLoading ? 'Loading available messes...' : 'No messes available for this selection.'}
                        </p>
                      </div>
                    ) : (
                      <div className="mess-restaurant-grid">
                        {availability.map(m => (
                          <div key={m.messId} className={`restaurant-card ${selectedMess === m.messId ? 'selected' : ''}`} onClick={() => setSelectedMess(m.messId)}
                            style={{ cursor: 'pointer', padding: '16px', border: selectedMess === m.messId ? '2px solid var(--primary)' : '1px solid #E2E8F0', borderRadius: '16px', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontWeight: 800, fontSize: '16px' }}>{m.name}</h4>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.booked}/{m.capacity} booked</p>
                              </div>
                              <div className="rest-rating">★ {m.rating ? m.rating.toFixed(1) : '0.0'}</div>
                            </div>
                            <div style={{ marginTop: '12px', height: '6px', background: '#EDF2F7', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(m.booked / m.capacity) * 100}%`, background: 'var(--primary)' }} />
                            </div>
                            {selectedMess === m.messId && (
                              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>✓ Your order goes here</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '100px' }}>
                    {sections.map(section => {
                      let itemsToDisplay = section.items

                      // Filter Dal section to show only scheduled item
                      if (section.key === 'dal') {
                        const scheduledId = getDalForDay(selectedDate, selectedMeal)
                        itemsToDisplay = section.items.filter(i => i.id === scheduledId)
                        // Fallback if ID doesn't match for some reason, show first
                        if (itemsToDisplay.length === 0) itemsToDisplay = [section.items[0]]
                      }

                      return (
                        <div key={section.key} style={{ marginBottom: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{section.label}</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {section.key === 'dal' ? 'Today\'s Special' : 'Choose 1'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {itemsToDisplay.map(item => (
                              <MenuItemCard key={item.id} item={item} sectionKey={section.key} />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {/* Carbs for Lunch/Dinner */}
                    {(selectedMeal === 'LUNCH' || selectedMeal === 'DINNER') && (
                      <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Carbs</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #F1F2F6' }}>
                            <p style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>ROTI COUNT</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                              {['1', '2', '3', '4', '5', '6', '7', '8'].map(n => (
                                <button key={n} onClick={() => setSelections(s => {
                                  const newS = { ...s }
                                  if (newS.rotiCount?.id === n) delete newS.rotiCount
                                  else newS.rotiCount = { id: n, portion: 'FULL' }
                                  return newS
                                })}
                                  style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '16px',
                                    border: selections.rotiCount?.id === n ? '2px solid var(--primary)' : '2px solid #E2E8F0',
                                    background: selections.rotiCount?.id === n ? '#F8F7FF' : 'white',
                                    color: selections.rotiCount?.id === n ? 'var(--primary)' : 'var(--text-main)',
                                    transition: 'all 0.2s ease',
                                  }}>
                                  {n}
                                  <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '2px' }}>Rs.{CARB_PRICES[n]}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #F1F2F6' }}>
                            <p style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>RICE</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {['Plain Rice', 'Jeera Rice', 'No Rice'].map(r => (
                                <div key={r}>
                                  <button onClick={() => setSelections(s => {
                                    const newS = { ...s }
                                    if (newS.rice?.id === r) delete newS.rice
                                    else newS.rice = { id: r, portion: 'FULL' }
                                    return newS
                                  })}
                                    style={{
                                      width: '100%', padding: '10px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textAlign: 'left',
                                      border: selections.rice?.id === r ? '2px solid var(--primary)' : '2px solid #E2E8F0',
                                      background: selections.rice?.id === r ? '#F8F7FF' : 'white',
                                      color: selections.rice?.id === r ? 'var(--primary)' : 'var(--text-main)',
                                      display: 'flex', justifyContent: 'space-between', transition: 'all 0.2s ease',
                                    }}>
                                    <span>{r}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                                      +Rs.{selections.rice?.id === r && selections.rice.portion === 'HALF' ? Math.round(CARB_PRICES[r] * 0.7) : CARB_PRICES[r]}
                                    </span>
                                  </button>
                                  {selections.rice?.id === r && r !== 'No Rice' && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', paddingLeft: '4px' }}>
                                      {['HALF', 'FULL'].map(p => (
                                        <button key={p}
                                          onClick={() => setSelections(s => ({ ...s, rice: { id: r, portion: p as any } }))}
                                          style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                                            border: selections.rice?.portion === p ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                                            background: selections.rice?.portion === p ? 'var(--primary)' : 'white',
                                            color: selections.rice?.portion === p ? 'white' : 'var(--text-main)',
                                          }}>
                                          {p}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floating Order Bar */}
                  <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: 'white', borderRadius: '20px',
                    padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '32px',
                    boxShadow: '0 20px 50px rgba(108,92,231,0.4)', zIndex: 100, minWidth: '500px',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>{selectedMeal} · {formatDate(selectedDate)}</div>
                      <div style={{ fontSize: '22px', fontWeight: 800 }}>Rs. {livePrice}</div>
                    </div>
                    <button
                      onClick={handleBook}
                      disabled={isLoading || !selectedMess || Object.keys(selections).length === 0}
                      style={{
                        background: 'white', color: 'var(--primary)', padding: '14px 32px',
                        borderRadius: '12px', fontWeight: 800, fontSize: '16px', flex: 1,
                        opacity: (!selectedMess || Object.keys(selections).length === 0) ? 0.6 : 1,
                        cursor: (!selectedMess || Object.keys(selections).length === 0) ? 'not-allowed' : 'pointer',
                      }}>
                      {isLoading ? 'Booking...' : !selectedMess ? 'Select a Mess' : Object.keys(selections).length === 0 ? 'Select an Item' : `Confirm Order`}
                    </button>
                  </div>
                </div>
              )
            })()}

            {activeNav === 'history' && (
              <div className="panel-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2>Booking History</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['ALL', 'UPCOMING', 'SERVED', 'SKIPPED'].map(f => (
                      <button key={f} onClick={() => setHistoryFilter(f)}
                        style={{
                          padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                          background: historyFilter === f ? 'var(--primary)' : '#F1F2F6',
                          color: historyFilter === f ? 'white' : 'var(--text-muted)',
                          border: 'none', cursor: 'pointer'
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="history-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Meal</th>
                        <th>Mess</th>
                        <th>Status</th>
                        <th>Token No</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter(o => {
                          if (historyFilter === 'ALL') return true
                          if (historyFilter === 'UPCOMING') return o.status === 'BOOKED' || o.status === 'DEFAULTED'
                          return o.status === historyFilter
                        })
                        .map(o => (
                          <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => setDetailInfo({
                            title: `Order Summary: ${o.mealType}`,
                            content: (
                              <div style={{ display: 'grid', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Price</span><strong>Rs. {o.price}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Selections</span><strong style={{ textAlign: 'right' }}>{Object.values(o.selections).map((s: any) => s.id).join(', ')}</strong></div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Ordered on {new Date(o.createdAt).toLocaleString()}</p>
                              </div>
                            )
                          })}>
                            <td>{formatDate(o.mealDate)}</td>
                            <td><strong>{o.mealType}</strong></td>
                            <td>Mess Hall</td>
                            <td><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                            <td className="token-no">{o.tokenNo}</td>
                            <td>
                              {o.status === 'SERVED' && !o.isReviewed && (
                                <button className="primary-button" style={{ padding: '4px 12px', fontSize: '12px' }}
                                  onClick={(e) => { e.stopPropagation(); setReviewingOrderId(o._id); }}>
                                  Rate
                                </button>
                              )}
                              {o.isReviewed && <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '12px' }}>✓ Rated</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeNav === 'profile' && (
              <div className="panel-card">
                <h2>My Profile</h2>
                <div style={{ marginTop: '32px', display: 'flex', gap: '48px' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>FULL NAME</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{student?.fullName}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>ROLL NUMBER</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{student?.rollNo}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>PREFERENCE</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{student?.dietaryPreference}</p>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'reviews' && (
              <ReviewsPanel
                orders={orders}
                onRate={(id) => setReviewingOrderId(id)}
                comparison={comparison}
                allReviews={allReviews}
                loadingComp={loadingComp}
              />
            )}
            {activeNav === 'leaves' && <LeaveRequestPanel token={token!} onComplete={() => setActiveNav('home')} addToast={addToast} />}
          </main>
        </div>
      </div>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-icon">{t.type === 'success' ? 'OK' : 'ER'}</div>
            <div className="toast-content">{t.message}</div>
          </div>
        ))}
      </div>

      {activeStoryIndex !== null && (
        <StoryModal
          stories={dashboardInsights}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
      {reviewingOrderId && (
        <ReviewModal
          onClose={() => setReviewingOrderId(null)}
          onSubmit={(data) => {
            handleReviewSubmit(reviewingOrderId, data)
            setReviewingOrderId(null)
          }}
        />
      )}
      {detailInfo && (
        <DetailModal
          title={detailInfo.title}
          content={detailInfo.content}
          onClose={() => setDetailInfo(null)}
        />
      )}
    </>
  )
}
