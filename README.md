# Website Health Auditor

A Next.js MVP that turns real mobile PageSpeed Insights/Lighthouse measurements into a concise website health report with optional Gemini explanations.

## Local setup

```bash
npm install
cp .env.example .env.local
# Add your Google PageSpeed Insights API key
npm run dev
```

Open http://localhost:3000. The API key stays server-side. Gemini is optional; without it, the app uses Lighthouse findings directly. A PageSpeed key is required; no fake measurements are generated.

## Deploy to Vercel

Import the repository in Vercel, add `PAGESPEED_API_KEY` in Project Settings → Environment Variables, then deploy.
# HealthAuditor
