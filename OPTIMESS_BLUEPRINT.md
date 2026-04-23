# Optimess Product + System Blueprint

Date: 2026-04-23

## 1) Confirmed Product Decisions

- Brand: Optimess
- Deployment split: Two separate frontend platforms on separate domains
  - Student platform (example: student.optimess.in)
  - Mess Manager platform (example: manager.optimess.in)
- Backend: One shared API for both platforms
- Auth model:
  - Student login: roll number + password
  - Manager login: admin-created accounts only
- Student onboarding:
  - Bulk import script will create student accounts
  - Every student starts with wallet credit of INR 18,000
- Dietary preference onboarding:
  - On first login, student must select Jain or Not Jain
  - Preference is saved permanently in profile and used in meal availability/filtering
- Booking window: students can pre-book meals up to next 7 days
- Ordering deadline: previous day midnight (IST)
- After deadline: no order edits
- Missed order handling: default meal + auto-assigned mess
- Pickup: single token per meal, validated by RFID student ID scan
- Mess competition:
  - All 3 messes visible
  - Fixed meal prices across all messes
  - Ratings enabled
  - Capacity limits enabled and visible at booking time
  - No overflow reroute when a mess is full
- Menu model:
  - Weekly structure fixed as provided
  - Portion options: half/full where applicable
  - No paid add-ons
  - Allergy flags enabled
  - Nutrition display enabled
- Skip and save:
  - Meal-by-meal skip enabled
  - No maximum skip cap
  - Skip reason tracking enabled
- Admin panel: no separate super-admin platform for now
- Reporting: required + export support
- Notifications: in-web only, English only
- Compliance constraints: none additional for MVP
- Platform target: web app only
- Tech stack: MERN

## 2) Cutoff Policy (Final)

- Skip cutoff is the same as meal ordering cutoff: previous day midnight IST.
- Final rule: if meal order closes at 11:59 PM for next day, skip also closes at 11:59 PM.

## 3) High-Level Architecture

## Frontend split (no role mixing)

- Separate frontend apps and deployments:
  - optimess-student-web
  - optimess-manager-web
- Separate domains and cookie scopes
- Separate CI/CD pipelines
- Role-specific UI and route trees
- No manager routes in student app bundle and no student routes in manager app bundle

## Shared backend

- services/api (Node.js + Express + TypeScript recommended)
- MongoDB (single cluster, role-partitioned collections and strict authorization checks)
- Redis (token/session cache, queue support)
- Optional worker process for nightly jobs and aggregates

## Security boundaries

- JWT access token with role claim: STUDENT or MANAGER
- API middleware enforces role on every route group
- Resource-level checks (manager can only access assigned mess)
- Separate rate limits per app origin
- CORS allowlist for student and manager domains only

## 4) Suggested Monorepo Structure

- apps/student-web
- apps/manager-web
- services/api
- services/worker
- packages/ui (optional shared primitives)
- packages/types (shared DTO and enums)
- docs

## 5) Core Data Model (MongoDB)

## Identity and access

- users
  - _id, role, rollNo, passwordHash, status, createdAt
- managerProfiles
  - userId, messId, name, phone
- studentProfiles
  - userId, rollNo, fullName, hostel, department, dietaryPreference(JAIN/NON_JAIN), dietaryPreferenceLockedAt

## Wallet and ledger

- wallets
  - studentId, openingCredit (18000), availableBalance, blockedBalance
- walletTransactions
  - studentId, type(CREDIT/DEBIT/REFUND/ADJUSTMENT), amount, mealOrderId, note, createdAt

## Menu and pricing

- weeklyMenuTemplates
  - mealType, dayOfWeek, sections, options, nutrition, allergens, active
- mealPrices
  - mealType, priceHalf, priceFull, effectiveFrom

## Mess and capacity

- messes
  - messId, name, status, ratingAvg
- messCapacities
  - messId, mealDate, mealType, capacity, bookedCount

## Ordering and pickup

- mealOrders
  - studentId, mealDate, mealType, messId, selections, portion, status(BOOKED/SERVED/SKIPPED/NO_SHOW/DEFAULTED), tokenNo, rfidScanAt
- skipLogs
  - studentId, mealDate, mealType, reasonCode, note
- defaultAssignments
  - studentId, mealDate, mealType, messId, menuSnapshot

## Feedback and complaints

- ratings
  - studentId, messId, mealOrderId, score, comment
- complaints
  - studentId, messId, category, text, status, response

## Analytics snapshots

- mealAggregates
  - mealDate, mealType, messId, totals, selectionBreakdown, wasteEstimate

## 6) API Surface (Role-Segregated)

## Auth

- POST /auth/student/login
- POST /auth/manager/login
- POST /auth/logout

## Student APIs

- GET /student/me
- GET /student/wallet
- POST /student/preferences/dietary
- GET /student/menu?fromDate=&toDate=
- GET /student/messes/availability?mealDate=&mealType=
- POST /student/orders
- POST /student/orders/skip
- GET /student/orders/history
- GET /student/token/current
- POST /student/ratings
- POST /student/complaints

## Manager APIs

- GET /manager/dashboard/headcount
- GET /manager/production-plan?mealDate=&mealType=
- GET /manager/tokens/live
- POST /manager/tokens/serve-by-rfid
- GET /manager/inventory/suggestions
- GET /manager/revenue
- GET /manager/complaints
- POST /manager/complaints/:id/respond

## Shared system APIs

- GET /reports/export?type=csv|pdf

## 7) Business Rules Engine

- Nightly cutoff job (11:59 PM IST)
  - lock next-day orders
  - create default orders for non-ordering students
  - assign default mess using load balancing + capacity
  - reserve wallet deductions for generated orders
- Booking horizon rule
  - students can place orders from today up to the next 7 days only
  - API rejects order requests outside booking horizon
- Real-time booking checks
  - show remaining slots per mess before confirming
  - hard stop when selected mess is full
- Wallet debit timing
  - debit at order lock (or instant at booking; recommended: instant booking debit with reversal if valid skip before cutoff)
- No post-cutoff editing
- One active token per student per meal
- RFID scan marks order as served and timestamps service event

## 8) Student UX Flow

- Login with roll number + password
- First login setup:
  - mandatory one-time question: Jain or Not Jain
  - save permanently and lock preference
- Home: wallet balance, next cutoff, upcoming booked meals
- Meal booking screen:
  - date picker supports booking up to next 7 days
  - select meal
  - choose mess with live remaining slots
  - configure menu choices and portion (half/full)
  - view allergen flags and nutrition
  - confirm booking and receive token
- Skip meal screen:
  - select meal
  - choose skip reason
  - submit before cutoff
- History screen:
  - booked/served/skipped/defaulted/no-show
  - wallet transaction mapping
- Ratings and complaints

## 9) Manager UX Flow

- Login with admin-created manager account
- Live dashboard:
  - total headcount and per-item headcount (example: red gravy + paneer count)
- Production plan:
  - base gravy quantity estimates
  - top-up breakdown counts
  - dry curry ratio
- Fulfillment:
  - RFID scan terminal
  - token served state updates
- Inventory suggestions:
  - projected ingredient usage from next-day preorders
- Revenue and payout summary
- Staff tasks and complaint handling

## 10) UI Design Direction (adapted from DESIGN.md)

Use the existing design principles as the base visual system, adjusted for food operations.

- Theme:
  - dark technical dashboard feeling, high readability
- Color tokens:
  - bg: #121212
  - card: #1E1E1E
  - primary: #00E5FF
  - success: #32D74B
  - alert: #FF453A
  - text-primary: #FFFFFF
  - text-secondary: #98989D
- Components:
  - cards radius 16px, subtle borders, dense but readable tables
- Typography:
  - headings: Inter semibold
  - numeric metrics: JetBrains Mono/Fira Code bold
- Layout:
  - 12-column grid
  - top KPI row + main chart + right-side alerts/actions

## 11) Phase Plan (10 Weeks)

## Phase 1 (Weeks 1-2): Foundation

- Monorepo setup and CI/CD for 2 web apps + 1 API
- Auth, role middleware, user import script
- Wallet initialization with INR 18,000 credit per student

## Phase 2 (Weeks 3-4): Student Core

- Menu rendering and meal booking
- Mess capacity visibility and enforcement
- Skip flow and reasons
- Token generation

## Phase 3 (Weeks 5-6): Manager Core

- Live headcount dashboard by item
- Production planning views
- RFID serve flow

## Phase 4 (Weeks 7-8): Analytics + Ops

- Ratings and complaints
- Revenue and payout dashboards
- Inventory recommendation service
- CSV/PDF export reports

## Phase 5 (Weeks 9-10): Hardening + Launch

- Load testing for peak booking window
- Role isolation and security audit
- UAT with sample hostels
- Production rollout

## 12) Deployment Topology

- student.optimess.in -> Student frontend deployment
- manager.optimess.in -> Manager frontend deployment
- api.optimess.in -> Shared backend API
- Shared MongoDB + Redis
- Strict role authorization and origin-based CORS

## 13) MVP Checklist (Recommended)

- Student login + wallet
- One-time Jain/Not Jain capture and permanent storage
- Meal booking up to next 7 days
- Skip and save
- Default order assignment
- Mess capacity visibility at booking
- Token generation + RFID serve flow
- Manager item-level headcount dashboard
- Basic reports export (CSV)

## 14) Immediate Build Tasks

- Implement one-time dietary preference capture and lock
- Implement booking horizon validation (up to next 7 days)
- Finalize data contracts (request/response schemas)
- Create DB indexes for booking throughput
- Start implementation with auth + wallet + booking APIs
- Build student booking UI and manager headcount dashboard in parallel
