# GOFAMINT Church Leader Dashboard

Analytics console for individual church administrators. View attendance,
engagement, lesson completions, and per-teacher performance for *your* church.

Built with **Vite + React + Tailwind CSS**. Deploys as a static SPA.

## Local development

```bash
npm install
npm run dev          # → http://localhost:5174
```

## Build

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build locally
```

## Configuration

The default API URL points to the Railway backend. Override via env var if you
self-host:

```bash
# .env.local
VITE_API_URL=https://your-backend.example.com
```

A church admin can also override the API URL on the login screen via the
"Advanced" toggle.

## Authentication

Sign in with the church admin email + password configured by the church when
they signed up. The login flow calls `POST /api/church-admin/login` and stores
the returned `admin_token` in `localStorage` — that token is sent as the
`x-church-key` header on every analytics request.

Pending or rejected church accounts cannot sign in.

## Deploying to Vercel

1. Import this repo in Vercel.
2. Vercel auto-detects Vite — no extra config needed.
3. The included `vercel.json` handles SPA routing fallback.

## Pages

Insights: Attendance · Engagement · Lessons · Teachers

All analytics endpoints are church-scoped — a leader only ever sees data for
classes inside their own church.

## Reference

The legacy single-file HTML version lives in
[`_legacy/church-admin.html`](_legacy/church-admin.html) for reference.
