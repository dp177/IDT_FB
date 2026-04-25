# Optimess Monorepo

Optimess is a MERN-based mess management platform with role-separated web apps and one shared API.

- Student app: meal booking, skips, wallet visibility, tokens, ratings
- Manager app: live headcount, production planning, RFID serving, revenue and capacity views
- Shared API: authentication, role authorization, booking logic, wallet and analytics endpoints

## Monorepo layout

```text
IDT/
  apps/
    student-web/      # Student React app (Vite)
    manager-web/      # Manager React app (Vite)
  services/
    api/              # Express + TypeScript API
```

## Tech stack

- Frontend: React 19, TypeScript, Vite
- Backend: Node.js, Express 5, TypeScript
- Database: MongoDB (Mongoose)
- Auth: JWT bearer tokens
- Validation: Zod

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB running locally or a reachable MongoDB URI

## Quick start

1. Install dependencies from repository root:

```bash
npm install
```

2. Create API environment file:

```bash
copy services\\api\\.env.example services\\api\\.env
```

3. Start the API:

```bash
npm run dev:api
```

4. In separate terminals, start the frontend apps:

```bash
npm run dev:student
npm run dev:manager
```

5. Open apps in browser:

- Student app: http://localhost:5173
- Manager app: http://localhost:5174
- API base: http://localhost:4000

## Root scripts

Run these from repository root:

- `npm run dev:student` - Start student app (Vite)
- `npm run dev:manager` - Start manager app (Vite on port 5174)
- `npm run dev:api` - Start API with watch mode
- `npm run build` - Build all workspaces
- `npm run lint` - Run lint in all workspaces

## Environment configuration (API)

File: `services/api/.env`

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/optimess
JWT_SECRET=your-secret-key-here
STUDENT_APP_ORIGIN=http://localhost:5173
MANAGER_APP_ORIGIN=http://localhost:5174
AUTO_SEED_DEMO=true
```

Notes:

- CORS currently allows localhost ports during development.
- `seedDemoData()` runs on API startup and is idempotent.

## Demo accounts (auto-seeded)

When demo seed is enabled/default startup behavior:

- Manager login
  - username: `manager1`
  - password: `manager123`
- Student login
  - rollNo: `2026CS001`
  - password: `student123`

## Important business rules currently enforced

- Booking window: today through next 7 days
- Cutoff: previous day midnight IST for booking and skip
- Dietary preference: one-time lock after first set
- Capacity visibility and checks at mess selection time
- One token per student per meal (active states)

## API overview

### Public

- `GET /` - API metadata
- `GET /health` - Health check
- `POST /auth/student/login`
- `POST /auth/manager/login`
- `POST /auth/logout`

### Student routes (JWT role: STUDENT)

- `GET /student/me`
- `GET /student/wallet`
- `POST /student/preferences/dietary`
- `POST /student/preferences/default-menu`
- `GET /student/menu`
- `GET /student/messes/availability`
- `POST /student/orders`
- `POST /student/orders/skip`
- `POST /student/orders/skip/batch`
- `GET /student/orders/history`
- `POST /student/orders/:id/review`
- `GET /student/messes/:id/reviews`
- `GET /student/reviews/comparison`
- `GET /student/reviews/all`
- `GET /student/token/current`

### Manager routes (JWT role: MANAGER)

- `GET /manager/dashboard/headcount`
- `GET /manager/production-plan`
- `GET /manager/tokens/live`
- `POST /manager/tokens/serve-by-rfid`
- `GET /manager/forecast`
- `GET /manager/inventory/materials`
- `GET /manager/reviews/all`
- `GET /manager/revenue`
- `POST /manager/default-assignments/run`
- `GET /manager/messes/capacity`

## Seeding and data utilities

Run from repository root unless noted.

- Demo seed on API start: automatic
- Bulk seed script:

```bash
npm run seed:bulk --workspace services/api
```

The bulk seed script in `services/api/src/bulk-seed.ts` contains a hardcoded MongoDB URI and is intended for controlled development usage only. Update it before running in your own environment.

## Build for production

```bash
npm run build
```

After API build:

```bash
npm run start --workspace services/api
```

## Deployment

The cleanest production setup is:

- Student frontend deployed to its own domain
- Manager frontend deployed to its own domain
- Shared API deployed separately with a public HTTPS URL
- MongoDB hosted in Atlas or another managed MongoDB service

### Required production env vars

Set these on the API deployment:

```env
PORT=4000
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
STUDENT_APP_ORIGIN=https://student.your-domain.com
MANAGER_APP_ORIGIN=https://manager.your-domain.com
ALLOWED_ORIGINS=https://student.your-domain.com,https://manager.your-domain.com
AUTO_SEED_DEMO=false
```

Set this on each frontend deployment:

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

### Deployment notes

- Keep the API and frontends on HTTPS in production.
- Make sure the API CORS allowlist matches the deployed frontend domains.
- Disable demo seeding in production unless you explicitly need it for setup.
- Rotate any development-only credentials before going live.

## Troubleshooting

- Port already in use:
  - Change Vite/API ports or stop the conflicting process.
- Mongo connection fails:
  - Verify `MONGODB_URI` and that MongoDB is reachable.
- CORS errors in browser:
  - Confirm frontend origins match `STUDENT_APP_ORIGIN` and `MANAGER_APP_ORIGIN`.
- 401 responses on protected routes:
  - Ensure Bearer token is present and matches route role.

## Security and production notes

- Replace JWT secret with a strong value in production.
- Restrict CORS to actual deployed domains.
- Remove default/demo credentials outside development.
- Do not commit real credentials to source control.

## Product reference

For full product and architecture decisions, see:

- `OPTIMESS_BLUEPRINT.md`
