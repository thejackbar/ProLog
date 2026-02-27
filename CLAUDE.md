# ProLog — Architecture Reference

Full developer documentation: `prolog-docs.html`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router 6 + Recharts |
| Backend | Python FastAPI (async) |
| ORM | SQLAlchemy (async) + asyncpg |
| Database | PostgreSQL 16 |
| Auth | JWT in httpOnly cookies |
| Containers | Docker Compose + Nginx |
| AI | Claude Opus 4.6 via Anthropic API |

---

## Backend Structure

```
backend/
  main.py        # app factory, CORS, middleware, rate limiting, router registration
  config.py      # Pydantic Settings reading from .env
  database.py    # async engine, AsyncSessionLocal, get_db() dependency
  models.py      # SQLAlchemy ORM models (UUID PKs)
  schemas.py     # Pydantic request/response schemas
  auth.py        # JWT, password utils, get_current_user dependency
  procedures.py  # static procedure hierarchy (mirrors frontend)
  routers/       # one file per resource
    auth.py
    cases.py
    users.py
    ai.py
    export.py
```

---

## Backend Conventions

- **Config**: Pydantic `Settings` class in `config.py`, reads from `.env`. Auto-converts `postgres://` to `postgresql+asyncpg://`.
- **Database**: Async SQLAlchemy engine with connection pooling. `get_db()` FastAPI dependency yields a session and commits/rolls back.
- **Primary keys**: UUIDs on all models (`default=uuid4`).
- **Auth**: JWT stored in `httpOnly; Secure; SameSite=Lax` cookie. `get_current_user()` dependency reads the cookie — never use Bearer tokens.
- **Passwords**: SHA-256 pre-hash before bcrypt (handles passwords > 72 bytes). Support both new and legacy hash formats in `verify_password()`.
- **User isolation**: Every case/resource query must include `WHERE user_id = current_user.id`. Users must never be able to access each other's data.
- **Rate limiting**: In-memory counter per IP on all auth routes. Cap: 20 requests / 60 s.
- **Security headers middleware**: Apply `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection` to every response.
- **Forgot password**: Always return `204` regardless of whether the email exists (prevents user enumeration).
- **Reset tokens**: HMAC-signed, valid 1 hour, invalidated immediately on password change by incorporating the password hash into the signing material.
- **JSON fields**: Use for optional/structured data on models (e.g. `complications`, `oocyte_data`) rather than adding many nullable columns.
- **Routers**: One file per resource in `routers/`. Register all routers in `main.py`.
- **Schemas**: Separate `Create`, `Update`, and `Response` schemas per resource. `Response` schemas never include password fields.
- **Pagination**: List endpoints return `{items, total, page, pages}` via a `ListResponse` schema.
- **Bulk operations**: Support bulk delete via a `POST /resource/bulk-delete` endpoint accepting a list of IDs.
- **SMTP fallback**: If SMTP is not configured, log the email content to console instead of raising an error.

---

## Frontend Conventions

- **API client**: Centralised in `api/client.js`. All requests use `credentials: 'include'`. Namespaced by resource (`api.cases.list()`, `api.auth.login()`, etc.).
- **Auth context**: `AuthContext.jsx` manages `user` + `loading` state, `login()` / `logout()` methods, and auto-restores session on mount via `GET /api/auth/me`.
- **Routing**: Public routes redirect to dashboard if already logged in. Protected routes redirect to login if not authenticated.
- **Static data**: Procedure hierarchy lives in `data/procedures.js` and is mirrored in `backend/procedures.py`.
- **Conditional form fields**: Show/hide form sections based on selected procedure category/type.

---

## Prompt to Reuse This Architecture in a New Project

```
Set up the FastAPI backend following the same architecture patterns as ProLog
(reference: CLAUDE.md and prolog-docs.html).

Use:
- Pydantic Settings in config.py reading from .env
- Async SQLAlchemy in database.py with a get_db() dependency
- JWT auth in httpOnly cookies (not Bearer tokens)
- bcrypt + SHA-256 pre-hash for passwords
- UUID primary keys on all models
- One router file per resource in routers/
- get_current_user() dependency for auth
- Security headers middleware and in-memory rate limiting on auth routes
- Forgot-password always returns 204
- All queries filtered by current_user.id

Resources needed: [LIST YOUR MODELS HERE]
```
