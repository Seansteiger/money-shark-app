<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1f6Tf8J4ZYdAOK6oXn8sQRSdmfmUHRncm

## Deployment to Vercel

The app is configured for seamless deployment on Vercel.

1.  **Push to GitHub**: Ensure your code is pushed to a GitHub repository.
2.  **Import to Vercel**: Connect your repository in Vercel.
3.  **Environment Variables**: Add the following environment variables in Vercel Project Settings:
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_GEMINI_API_KEY` (Optional, if using AI features)
4.  **Deploy**: Vercel will automatically detect Vite and run `npm run build`.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Configure Environment:
   *   Copy `.env.example` to `.env.local`
   *   Fill in your Supabase and Gemini keys.
3. Run the app:
   `npm run dev`
