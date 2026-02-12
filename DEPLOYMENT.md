# Deployment Guide (All Vercel)

This app is deployed entirely on **Vercel**:
- **Frontend**: Vite static site
- **Backend**: Vercel Serverless Functions (in /api)
- **Database**: Vercel Postgres

---

## 1) Create Vercel Postgres

1. Go to https://vercel.com/dashboard
2. Open your project → **Storage** → **Create Database** → **Postgres**
3. Copy the `DATABASE_URL`

---

## 2) Set Environment Variables in Vercel

In your Vercel project → **Settings** → **Environment Variables**:

```
DATABASE_URL=postgresql://...
ACCESS_TOKEN_SECRET=<random-64-hex>
REFRESH_TOKEN_SECRET=<random-64-hex>
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
SECURE_COOKIES=true
VITE_API_BASE_URL=/api
VITE_GEMINI_API_KEY=<optional>
```

---

## 3) Deploy

Push to GitHub and Vercel will deploy automatically.

---

## 4) Test

Visit:

- Frontend: `https://your-app.vercel.app`
- Health check: `https://your-app.vercel.app/api/health`

---

## Troubleshooting

### "Failed to fetch"
- Ensure `VITE_API_BASE_URL=/api`
- Confirm `/api/health` responds with JSON

### Database errors
- Confirm `DATABASE_URL` is set in Vercel
- Check Vercel Postgres connection in the Storage tab

---

## Updating the App

```
git add .
git commit -m "Update"
git push origin master
```

Vercel auto-deploys on push.
