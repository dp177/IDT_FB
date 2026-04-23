# Optimess Monorepo

This workspace contains two separate frontend apps and one shared backend API.

## Apps and services

- apps/student-web: Student platform
- apps/manager-web: Mess manager platform
- services/api: Shared Express API

## Setup

1. Install dependencies:

   npm install

2. Configure API environment:

   Copy services/api/.env.example to services/api/.env and set values.

3. Run each app in separate terminals:

   npm run dev:student
   npm run dev:manager
   npm run dev:api

## URLs

- Student: http://localhost:5173
- Manager: http://localhost:5174
- API: http://localhost:4000

## Auth and role separation

- Login endpoints:
  - POST /auth/student/login with rollNo + password
  - POST /auth/manager/login with username + password
- Student routes are protected by JWT + STUDENT role.
- Manager routes are protected by JWT + MANAGER role.

## Demo local credentials (if AUTO_SEED_DEMO=true)

- Student:
  - rollNo: 2026CS001
  - password: student123
- Manager:
  - username: manager1
  - password: manager123

## Implemented business rules

- One-time Jain/Not Jain preference lock for student.
- Booking horizon limited to next 7 days.
- Booking and skip cutoff: previous day midnight IST.
- Capacity-aware mess booking and slot visibility.
- Default assignment endpoint for non-booked students per meal.
- RFID-based serve marking for manager.
