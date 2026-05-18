# Taximeter — VK Mini App MVP

Production-grade MVP taxi marketplace with realtime dispatch and taximeter.

## Stack
- Frontend: VK Mini Apps + React + TypeScript + VKUI + Socket.io client
- Backend: Node.js + Express + Socket.io + Prisma + PostgreSQL
- Maps: Yandex Maps JS API (fallback-ready architecture)

## Monorepo Structure
- `backend` — API, WebSocket server, dispatch, taximeter, simulation
- `frontend` — VK Mini App with passenger, driver, and admin dashboards
- `prisma` — shared Prisma schema

## Quick Start
### 1) Install dependencies
```bash
cd backend && npm i
cd ../frontend && npm i
```

### 2) Configure environment
Copy and edit:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3) Database
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 4) Run backend
```bash
npm run dev
```
Backend runs on `http://localhost:4000`.

### 5) Run frontend
```bash
cd ../frontend
npm run dev
```
Frontend runs on `http://localhost:5173`.

## Core Taximeter Formula
`P = S + D_real * rd + T_real * rt * Ktod`

Where:
- `S` — base fare
- `D_real` — real distance (km)
- `T_real` — real duration (minutes)
- `rd` — price per km
- `rt` — price per minute
- `Ktod` — time-of-day coefficient

## MVP Features Delivered
- realtime driver/passenger location sync
- dispatch with radius expansion (2km → 5km → 8km)
- tariff + Ktod configurable pricing engine
- live taximeter updates via WebSocket
- admin controls (tariffs, Ktod, balance top-up, simulation)
- ride lifecycle automation for simulation mode

## Deployment Notes
- Backend deploy: any Node host (Railway/Render/Fly)
- Frontend deploy: VK Mini Apps static hosting
- PostgreSQL: managed instance
- Set `CORS_ORIGIN` and `VITE_BACKEND_URL` correctly

