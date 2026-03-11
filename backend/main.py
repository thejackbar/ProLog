import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import Base, engine
from routers import auth as auth_router
from routers import cases as cases_router
from routers import ai as ai_router
from routers import export as export_router
from routers import users as users_router


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Create all tables on startup (dev convenience; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Dispose engine on shutdown
    await engine.dispose()


# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="ProLog API",
    description="Fertility & Gynaecology Clinical Case Logbook",
    version="1.0.0",
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    lifespan=lifespan,
    redirect_slashes=False,
)


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,   # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Simple in-memory rate limiter ─────────────────────────────────────────────
# Tracks request timestamps per IP for the auth endpoints.
# For production, replace with Redis-backed solution (e.g. slowapi + redis).

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60.0        # seconds
RATE_LIMIT_MAX_REQUESTS = 20    # per window per IP on auth routes


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@app.middleware("http")
async def rate_limit_auth(request: Request, call_next) -> Response:  # type: ignore[type-arg]
    if request.url.path.startswith("/api/auth/"):
        ip = _get_client_ip(request)
        now = time.monotonic()

        # Purge timestamps outside the window
        _rate_limit_store[ip] = [
            t for t in _rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW
        ]

        if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests – please slow down"},
            )

        _rate_limit_store[ip].append(now)

    return await call_next(request)


# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:  # type: ignore[type-arg]
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(cases_router.router)
app.include_router(users_router.router)
app.include_router(ai_router.router)
app.include_router(export_router.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.NODE_ENV}


# ── Procedures reference endpoint ─────────────────────────────────────────────
from procedures import PROC  # noqa: E402


@app.get("/api/procedures", tags=["procedures"])
async def get_procedures() -> dict:
    return PROC
