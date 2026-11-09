# Campus Services — Frontend

Minimal, English-language, KBTU-inspired UI for the **University Service Request** coursework MVP.

## Features

- Student / teacher / technician self-registration and email/password login.
- Role-based navigation and dashboard views.
- Students and teachers: submit a problem (room, category, description); view all their submitted issues, including archived completed issues; filter statuses.
- Technicians: browse unclaimed work, take a request, view assigned work, confirm completion, browse completed archive, filter loaded requests by keyword and category, filter archive by completion dates, and download CSV.
- Handles Django REST Framework pagination, 409 assignment conflicts, validation failures, connectivity errors, and expiring JWT tokens (including rotated refresh tokens).
- Desktop-focused layouts with basic smaller-screen fallbacks; keyboard focus indication and accessible labels; reduced-motion support.

## Run locally

Prerequisites: **Node.js 20+** and npm, plus the existing Django API and PostgreSQL backend.

**Terminal 1 — backend** (see `../backend/README.md` for initial database setup):

```powershell
cd backend
docker compose up -d db
docker compose up -d api
```

If the backend has not been initialized yet, first create `backend/.env` and follow its README's database setup/migration commands.

**Terminal 2 — frontend:**

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. `vite.config.js` forwards requests beginning with `/api` to **http://localhost:8000**, so the frontend can use same-origin requests in development. Existing backend `.env.example` already permits `http://localhost:5173` in CORS settings for direct requests.

For a separate hosted API, create `frontend/.env.local` containing:

```env
VITE_API_BASE_URL=https://api.example.edu
```

When deploying, configure the backend to permit the frontend origin through `CORS_ALLOWED_ORIGINS`, and use HTTPS.

## Build and tests

```powershell
npm run build
npm run preview
npm test
```

The build output is `frontend/dist/`. Node-based tests cover shared response adapters, category/date helpers, and API error messages. **Integration tests must be run with the actual Django API and a PostgreSQL database.**

## Manual acceptance checklist

1. Sign up as a **student**, **teacher**, and **technician** using three distinct emails. Registration takes the user to sign-in, as the backend returns a user, not authentication tokens.
2. Sign in as student or teacher. Submit a request with room, category, and description. Observe a confirmation banner and a `Waiting` request on the dashboard.
3. Sign in as technician. In `Available`, select `Take request`. Confirm it moves into `My tasks`.
4. Sign in again as the requester and refresh. The request should now show `In progress`.
5. As technician, mark the request completed; confirm it appears in `Completed` and can be exported to CSV.
6. As requester, refresh to confirm the request now shows `Completed` (backend combines active and archive history).
7. Verify empty lists, wrong password, duplicate email, missing form fields, desktop layout, keyboard navigation, and expired sessions.
8. For the 409 conflict, have two technicians attempt to take the same request. The second should receive a readable error.

## Backend API usage

| UI operation | Endpoint |
|---|---|
| Registration | `POST /api/auth/register/` |
| Login | `POST /api/auth/login/` |
| Restore signed-in user | `GET /api/auth/me/` |
| Refresh JWT | `POST /api/auth/refresh/` |
| Logout | `POST /api/auth/logout/` |
| Submit issue | `POST /api/requests/` |
| Requester history | `GET /api/requests/my/` |
| Available technician tasks | `GET /api/requests/available/?page=N` |
| Assigned technician tasks | `GET /api/requests/assigned/?page=N` |
| Claim a request | `POST /api/requests/{id}/take/` |
| Finish a request | `POST /api/requests/{id}/finish/` |
| Archive | `GET /api/archive/?page=N&date_from=...&date_to=...` |
| CSV download | `GET /api/archive/export/` with optional date filters |

No backend code or database schema was changed.

## UI choices in this revision

- Student and teacher accounts are the same requester dashboard (`role=user`), while `user_type` only changes the role label.
- The initial isometric K-shaped symbol was removed; **KBTU Campus Services** is a plain text mark, not an official university logo.
- Request cards prioritize technician acceptance/completion updates. The backend exposes `technician` as an ID, **not the technician's name**; the UI does not guess the name. If a future backend release adds `technician_name`, it will display it automatically.
- "Check for updates" re-fetches the latest statuses; live push updates are not implemented.
- **Technician search is limited to the currently loaded paginated page (25 requests)** because the backend has no `search` query parameter. It is clearly labeled when multiple pages exist. For global search, coordinate an API filter with the backend developer.
- Desktop is the target for this coursework revision; the previously provided responsive CSS remains as a fallback, without new mobile-specific development.

## Important notes

- The design is **KBTU-inspired**, with navy/turquoise accents and an original text-based mark; it **does not include an official university logo** or claim approval by KBTU.
- **Technician self-registration is deliberately enabled** for the class demo in accordance with the supplied backend. In a real institutional deployment this should be restricted **on the server**, not only by hiding the frontend option.
- JWTs currently live in **sessionStorage** for practical coursework login and tab refreshes. A production authentication design should consider httpOnly cookies and stronger CSRF/XSS protections.
- There are no photo uploads, comments, request cancellation, supervisor permissions, or password reset screens, because the approved MVP and API do not provide those functions.
