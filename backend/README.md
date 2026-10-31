# University Service Request: Django backend

A Django REST Framework + PostgreSQL API for a university maintenance request website.

## What is implemented

- Student/teacher `user` accounts and `technician` accounts (both can self-register for the coursework demo).
- Email/password authentication with JWT access and refresh tokens; refresh rotation and refresh-token logout blacklist.
- User dashboard data: submit a request, see all your requests (including finished requests) and their statuses.
- Technician dashboard data: unclaimed requests, requests assigned to me, finish my assigned work.
- Concurrency-safe request claiming with a conditional SQL update; duplicate claim returns **409 Conflict**.
- `created -> taken -> finished` lifecycle; finishing **copies data into an `ArchivedRequest` table and deletes the active row inside one PostgreSQL transaction**.
- Technician-only archive list, optional date interval filter, and CSV download.
- Server-side role and ownership verification, request validation, Django admin, API tests.

Not included on purpose: cancellation (US-08), a supervisor account type, frontend dashboards.

## Technology

Python 3.12 recommended, Django 5.2 LTS, Django REST Framework 3.18, Simple JWT 5.5.1, psycopg 3, PostgreSQL 16.

## Quick start (Windows + Docker Desktop, or Docker on other systems)

In PowerShell at the extracted project root:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace at least `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY` with your own values. The example secret is **not** suitable for deployment.

```powershell
docker compose up -d db
docker compose build api
docker compose run --rm api python manage.py makemigrations accounts service_requests archive
docker compose run --rm api python manage.py migrate
docker compose up -d api
```

The API is now at `http://localhost:8000/api/`; a health probe lives at `http://localhost:8000/api/health/`. The Django development server is appropriate for coursework and local development, **not** for public production deployment.

To run automated tests against a temporary PostgreSQL test database:

```powershell
docker compose run --rm api python manage.py test
```

To create an optional Django administration account:

```powershell
docker compose run --rm api python manage.py createsuperuser
```

Admin panel: `http://localhost:8000/admin/`.

**IMPORTANT:** Run `makemigrations` before the initial `migrate`; migration files are intentionally generated during initial setup and should subsequently be committed to your Git repository. After changing models, rerun `makemigrations` and `migrate`.

To stop everything without deleting your database:

```powershell
docker compose down
```

`docker compose down -v` also deletes the PostgreSQL volume, **including all stored data**. Avoid unless you intentionally want a reset.

## Local Python alternative

Requires Python 3.10+ (3.12 recommended) and a separately running PostgreSQL 14+ database.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

In `.env`, set `POSTGRES_HOST=localhost`, then configure valid PostgreSQL database/user credentials and create the database if needed. Run:

```powershell
python manage.py makemigrations accounts service_requests archive
python manage.py migrate
python manage.py runserver
python manage.py test
```

## HTTP API contract

All paths are relative to `http://localhost:8000`. Send `Content-Type: application/json` for JSON POST requests. Except registration, login, refresh, and health, API endpoints require an access token:

```
Authorization: Bearer <access_token>
```

| Method | Endpoint | Access | Response |
|---|---|---|---|
| POST | `/api/auth/register/` | Public | Registered user, `201` |
| POST | `/api/auth/login/` | Public | `access`, `refresh`, `user` |
| POST | `/api/auth/refresh/` | Public, valid refresh token | New access and rotated refresh |
| POST | `/api/auth/logout/` | Authenticated, valid refresh token | Blacklists refresh, `205` |
| GET | `/api/auth/me/` | Authenticated | Role, account, name |
| POST | `/api/requests/` | User | Created request, `201` |
| GET | `/api/requests/my/` | User | Own active and finished requests, array |
| GET | `/api/requests/available/` | Technician | Paginated list of unclaimed requests |
| GET | `/api/requests/assigned/` | Technician | Paginated list of assigned active requests |
| POST | `/api/requests/<id>/take/` | Technician | Claimed request or `409` |
| POST | `/api/requests/<id>/finish/` | Assigned technician | Archived request or `403`/`409` |
| GET | `/api/archive/` | Technician | Paginated finished requests |
| GET | `/api/archive/export/` | Technician | Download CSV file |
| GET | `/api/health/` | Public | `{"status": "ok"}` |

Filters for both archive endpoints: `?date_from=2026-10-01&date_to=2026-10-31`; dates are inclusive, ISO format `YYYY-MM-DD`, evaluated in the configured Django timezone (default `Asia/Almaty`).

**Dashboard implementation note:** These endpoints return data; the actual dashboard pages are frontend responsibility. The frontend should use `/api/auth/me/` (or the role returned on login) to route users to their respective dashboards.

### Registration example: student or teacher

```json
{
  "email": "student@example.edu",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "role": "user",
  "user_type": "student",
  "password": "StrongPass#2026!",
  "password_confirm": "StrongPass#2026!"
}
```

A teacher uses `"user_type": "teacher"`. A technician uses `"role": "technician", "user_type": ""`, or omits `user_type` entirely. A technician registration is permitted without administrator approval **solely because the assignment requires technician self-registration**; a deployed institutional service should restrict it.

### Login example

```json
{"email": "student@example.edu", "password": "StrongPass#2026!"}
```

The response includes:

```json
{
  "access": "<JWT access token>",
  "refresh": "<JWT refresh token>",
  "user": {
    "id": 1,
    "email": "student@example.edu",
    "first_name": "Ada",
    "last_name": "Lovelace",
    "role": "user",
    "user_type": "student"
  }
}
```

For refresh: `POST /api/auth/refresh/` with `{"refresh": "<refresh_token>"}`. If refreshing succeeds, replace the stored refresh token with the rotated one. For logout: `POST /api/auth/logout/` with `{"refresh": "<refresh_token>"}` and your current access token in `Authorization`. Logging out invalidates the supplied refresh token; previously issued access tokens can remain valid until they expire (15 minutes).

### Request submission example

```json
{
  "room_number": "B-201",
  "category": "printer",
  "description": "The printer does not pick up paper."
}
```

Supported categories: `printer`, `computer`, `projector`, `network`, `electrical`, `furniture`, `other`.

The requester name is captured automatically from the authenticated account at submission time (the frontend can show it in the form as a read-only prefilled field). Users may not forge requester identity or set request status/assigned technician through the request creation payload.

A newly submitted request has `"status": "created"` and `"technician": null`.

### Technician claiming and finishing

- Call `GET /api/requests/available/` for available tasks.
- Call `POST /api/requests/123/take/` (empty POST body) to claim task 123.
- If another technician already claimed it, the server returns `409` and a message to reload the available list.
- Call `GET /api/requests/assigned/` for accepted tasks.
- Call `POST /api/requests/123/finish/` to complete one of your assigned tasks.
- The returned record has `"status": "finished"` and `"finished_at"`.

### Request history and archiving

`GET /api/requests/my/` returns the logged-in user's requests from **both** the active and archived tables, with consistent request IDs and `created`, `taken`, or `finished` status. A technician can list **all** completed requests at `/api/archive/` or download an archive CSV using `/api/archive/export/`.

The archive's `original_request_id` remembers the active request's original ID. There is **no third (supervisor) role**.

## Database design

- `accounts_user`: email, hashed password, first/last name, role (`user`/`technician`), user type (`student`/`teacher`/blank for technicians).
- `service_requests_servicerequest`: user requester FK, technician FK (nullable), requester name snapshot, room, category, description, status (`created`/`taken`), timestamps.
- `archive_archivedrequest`: original request ID (unique), requester FK, technician FK, copied request data, submission/take/completion timestamps, and a database-constrained `finished` status.

**Why not just use a filtered table?** Objective 5 explicitly calls for finished requests to move into a separate database table. A transaction ensures the archive insertion and active row deletion happen together.

## Tests and user-story traceability

| Story | Coverage |
|---|---|
| US-01 | Email login, wrong credentials, missing account, user role |
| US-02 | Technician role, JWT login, dashboard API permissions |
| US-03 | Form validation, room required, submission, requester dashboard |
| US-04 | Atomic claim, active technician list, `409` on stale claim |
| US-05 | User can see created, taken, and finished status/history |
| US-06 | Registration, duplicate email, minimum password length, mismatch |
| US-07 | Technician archive list, date-filtered CSV export |
| US-08 | Intentionally excluded as requested |

Code is organized into `accounts`, `service_requests`, and `archive` apps with API tests in each app.

## Security and deployment notes

This is a development scaffold for a university assignment, not a production-ready institutional service. Before deployment: disable DEBUG, use a strong secret and HTTPS, use a proper production server, restrict technician registration, configure allowed hosts/origins, secure storage for JWTs, review privacy/data retention, and consider account-verification and brute-force protections.

The assignment explicitly calls for distinct errors for nonexistent and incorrect login credentials. The API implements that, but in production those errors should generally be made generic to avoid exposing which email addresses have accounts.

## Collaborating via GitHub

After the first successful `makemigrations`:

```powershell
git add .
git commit -m "Initialize Django service request API with JWT and PostgreSQL"
git push
```

Ensure `.env` remains ignored. Share this README and the API contract with the frontend developer so they can integrate early.
