# Money Shark - Capital Management

This project has been rebuilt as a full-stack app with a code-based backend (no Supabase runtime dependency).

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: Prisma ORM + SQLite (default, swappable via `DATABASE_URL`)
- Auth: JWT access tokens + rotating refresh tokens (httpOnly cookie)
- Security: `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, server-side input validation with `zod`

## Features

- Secure user registration and login
- Per-user isolated data (supports many users)
- Loan/customer management
- Global app settings per user
- Full reset endpoint scoped to current user
- Persistent database via Prisma migrations

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env`
   - Set strong values for:
     - `ACCESS_TOKEN_SECRET`
     - `REFRESH_TOKEN_SECRET`
3. Generate Prisma client and run migration:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
4. Start frontend + backend together:
   - `npm run dev:full`

Frontend runs on `http://localhost:3000`
Backend runs on `http://localhost:4000`

## Scripts

- `npm run dev` - frontend only
- `npm run dev:server` - backend only
- `npm run dev:full` - frontend + backend
- `npm run build` - frontend build
- `npm run prisma:generate` - Prisma client generation
- `npm run prisma:migrate` - apply schema migration

## Production Notes

- Use PostgreSQL in production by setting `DATABASE_URL`
- Set `SECURE_COOKIES=true` behind HTTPS
- Keep `.env` out of source control

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions to Vercel (frontend) and Render/Railway (backend).
