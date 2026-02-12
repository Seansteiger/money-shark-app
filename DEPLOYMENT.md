# Deployment Guide

This app consists of two parts:
1. **Frontend** (React + Vite) → Deploy to **Vercel**
2. **Backend** (Express + Prisma) → Deploy to **Render** or **Railway**

---

## Backend Deployment (Render/Railway)

### Option A: Deploy to Render (Recommended - Free Tier)

1. **Create account**: Visit [render.com](https://render.com) and sign up

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Seansteiger/money-shark-app`
   - Configure:
     - **Name**: `money-shark-api`
     - **Region**: Choose closest to your users
     - **Branch**: `master`
     - **Root Directory**: Leave blank
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
     - **Start Command**: `npm run dev:server`

3. **Environment Variables** (Add in Render Dashboard):
   ```
   DATABASE_URL=file:./prod.db
   API_PORT=10000
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ACCESS_TOKEN_SECRET=<generate-strong-random-secret-min-32-chars>
   REFRESH_TOKEN_SECRET=<generate-different-strong-random-secret-min-32-chars>
   ACCESS_TOKEN_TTL_SECONDS=900
   REFRESH_TOKEN_TTL_DAYS=7
   SECURE_COOKIES=true
   NODE_ENV=production
   ```

   **Generate secrets**: Use this in terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**: Click "Create Web Service"
   - Wait for build to complete
   - Note your backend URL (e.g., `https://money-shark-api.onrender.com`)

### Option B: Deploy to Railway

1. Visit [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `Seansteiger/money-shark-app`
5. Add environment variables (same as Render above)
6. Railway will auto-detect Node.js and deploy
7. Generate domain in Settings → Networking

---

## Frontend Deployment (Vercel)

### Prerequisites
- Backend deployed and URL noted

### Steps

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Visit [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import `Seansteiger/money-shark-app`
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `./`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Environment Variables** (Add in Vercel):
   ```
   VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
   VITE_GEMINI_API_KEY=<optional-for-ai-features>
   ```
   
   Replace `your-backend-url.onrender.com` with your actual backend URL from Render/Railway.

4. **Deploy**: Click "Deploy"

5. **Update Backend CORS**:
   - Go back to your backend service (Render/Railway)
   - Update `FRONTEND_URL` environment variable with your Vercel URL
   - Example: `FRONTEND_URL=https://money-shark-app.vercel.app`
   - Redeploy backend if needed

---

## Post-Deployment

### Test the Deployment

1. Visit your Vercel frontend URL
2. Try to register a new account
3. Create a test loan entry
4. Verify data persists after refresh

### Database Considerations

⚠️ **SQLite on Render**: 
- Free tier uses ephemeral storage
- Database resets on service restart
- For production, upgrade to PostgreSQL:

**Switch to PostgreSQL** (Production):

1. In Render/Railway, create a PostgreSQL database
2. Update `DATABASE_URL` in backend env vars:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?schema=public
   ```
3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // changed from sqlite
     url      = env("DATABASE_URL")
   }
   ```
4. Redeploy backend (migrations run automatically)

---

## Environment Variables Summary

### Backend (Render/Railway)
| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `file:./prod.db` or PostgreSQL URL | ✅ |
| `API_PORT` | `10000` | ✅ |
| `FRONTEND_URL` | `https://your-app.vercel.app` | ✅ |
| `ACCESS_TOKEN_SECRET` | `random-64-char-hex` | ✅ |
| `REFRESH_TOKEN_SECRET` | `different-64-char-hex` | ✅ |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | ✅ |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | ✅ |
| `SECURE_COOKIES` | `true` | ✅ |
| `NODE_ENV` | `production` | ✅ |

### Frontend (Vercel)
| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://api.onrender.com/api` | ✅ |
| `VITE_GEMINI_API_KEY` | `AIza...` | ❌ |

---

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend matches your Vercel URL exactly
- No trailing slash in URLs

### 401 Unauthorized
- Check `VITE_API_BASE_URL` is correct
- Verify backend is running (visit `https://your-backend-url/api/health`)

### Database Resets on Render Free Tier
- This is expected on free tier (ephemeral storage)
- Upgrade to PostgreSQL for persistence
- Or use Railway which provides persistent storage

### Build Failures
- Check build logs in Vercel/Render
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

---

## Security Checklist

- [x] Strong random secrets generated (32+ characters)
- [x] `SECURE_COOKIES=true` for HTTPS
- [x] CORS configured with specific origin
- [x] Rate limiting enabled
- [x] Password requirements enforced (10+ chars, mixed case, numbers, symbols)
- [x] SQL injection protected (Prisma)
- [x] XSS protected (React + helmet)

---

## Updating the App

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin master
   ```

2. Vercel and Render/Railway will auto-deploy on push

3. For database schema changes:
   - Create migration locally: `npx prisma migrate dev --name your_change`
   - Push to GitHub
   - Backend will run `prisma migrate deploy` on build

---

## Cost Estimate

- **Vercel**: Free for hobby projects
- **Render**: Free tier (with limitations)
- **Railway**: $5/month credit (usually enough for small apps)
- **PostgreSQL**: Free on Render/Railway included databases

**Total**: $0-5/month for low-traffic production deployment
