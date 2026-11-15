# Free demo deployment: Vercel + Render + Neon

This project is ready to run locally via `backend/compose.yaml` or remotely:
- frontend on Vercel (Vite build, `frontend/` root)
- Django backend on Render Free Web Service (Docker, `backend/` root)
- PostgreSQL on Neon Free

## 1. Push this code to GitHub

Use this ZIP as an updated working copy, or copy just the files listed under "Changes" below into your own working repository if you have made additional edits.
Do **not** push `backend/.env`, any database dumps, or real credentials.

## 2. Create Neon database

Create a Neon Free Postgres project. In the dashboard copy the Postgres connection string (usually `postgresql://.../neondb?sslmode=require`). Keep this secret: it contains the database password. You do *not* need to run PostgreSQL locally for production.

## 3. Deploy Django on Render

- Create **New > Web Service** and connect GitHub repository.
- Root Directory: `backend`
- Language / Runtime: **Docker**
- Instance type: **Free**
- Dockerfile in the root directory: `Dockerfile` (or let Render detect it)
- Do not set a custom Docker command: the Dockerfile starts `start.sh`.
- Add these **Render environment variables**:

  | Name | Value |
  |------|-------|
  | `DATABASE_URL` | Neon Postgres connection string containing `sslmode=require` |
  | `DJANGO_SECRET_KEY` | a long random secret, different from local `.env` |
  | `DJANGO_DEBUG` | `False` |
  | `CORS_ALLOWED_ORIGINS` | `https://<frontend>.vercel.app` (EXACT frontend origin, including `https://`) |

- Deploy. The `start.sh` script runs `manage.py migrate` then starts Gunicorn. At build time the Dockerfile collects Django's admin static files for WhiteNoise.
- Verify `https://<render-service>.onrender.com/api/health/` returns `{"status":"ok"}`.
- Render automatically supplies `RENDER_EXTERNAL_HOSTNAME`, which the backend allows. If you add a custom domain later, set `DJANGO_ALLOWED_HOSTS` to include it (and the Render hostname if necessary).

## 4. Deploy React frontend on Vercel

If your teammate already has a Vercel project, reuse it and edit its environment variables:
- Connect the same GitHub repository.
- Project Root Directory: `frontend`
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Add environment variable `VITE_API_BASE_URL` = `https://<render-service>.onrender.com` (**without** `/api` at the end)
- Redeploy production after adding the variable, because Vite embeds these values at build time.

`frontend/vercel.json` ensures direct navigation and refresh at routes like `/login` work.

## 5. Test the deployed application

1. Visit your Vercel URL. Register a **fictional** student and technician.
2. Log in, submit a test request, accept it as technician, and finish it.
3. Confirm archived data still exists after a Render sleep/restart.
4. If requests fail in the browser, open Developer Tools > Network/Console and check Render service logs. Cross-origin errors typically mean `CORS_ALLOWED_ORIGINS` mismatches the exact Vercel URL.

## Changes from the provided original ZIP

- `backend/config/settings.py`: `DATABASE_URL` support, WhiteNoise, static root, proxy and secure cookie settings, neutral UTC default.
- `backend/requirements.txt`: Gunicorn, WhiteNoise, dj-database-url.
- `backend/Dockerfile`: production CMD and build-time static collection (Compose overrides CMD for local dev).
- `backend/start.sh`: migrations and Gunicorn startup.
- `backend/.env.example`: neutral UTC default.
- `frontend/vercel.json`: single-page-app fallback for React Router routes.

## Notes / cautions

- Your **local Docker Compose setup still works**: it uses `POSTGRES_*` and overrides the production CMD with `runserver`.
- Do not use Render Free Postgres for long-term storage: it expires after 30 days.
- Render Free web services sleep after ~15 minutes of inactivity. The next visitor may wait ~1 minute.
- This coursework app allows self-registration as **technician**. Do not use real student information or present the demo as a production university system.
- Render's free tier does not include an interactive shell or paid pre-deploy commands, so this demo runs migrations at startup.
- Local accounts/data are NOT automatically copied to Neon; the hosted database starts empty.
