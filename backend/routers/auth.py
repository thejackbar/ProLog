from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    get_current_user,
    get_password_hash,
    send_reset_email,
    verify_password,
)
from config import settings
from database import get_db
from models import User
from schemas import ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = settings.JWT_EXPIRY_DAYS * 24 * 60 * 60  # seconds


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    # Check username uniqueness
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        )

    user = User(
        full_name=body.full_name,
        first_name=body.first_name,
        last_name=body.last_name,
        username=body.username,
        email=body.email,
        password_hash=get_password_hash(body.password),
        clinical_role=body.clinical_role,
    )
    db.add(user)
    await db.flush()  # get id before commit

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.JWT_EXPIRY_DAYS),
    )
    _set_auth_cookie(response, token)
    return user


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=UserResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(
        select(User).where(
            (User.username == body.username.lower())
            | (User.email == body.username.lower())
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.JWT_EXPIRY_DAYS),
    )
    _set_auth_cookie(response, token)
    return user


# ── Forgot password ───────────────────────────────────────────────────────────
@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    # Always return 204 to avoid exposing whether an email is registered
    if not user:
        return
    token = create_reset_token(user.id, user.password_hash)
    reset_url = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
    await send_reset_email(user.email, user.full_name, reset_url)


# ── Reset password ─────────────────────────────────────────────────────────────
@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> None:
    payload = decode_reset_token(body.token)
    user_id: str = payload["sub"]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset link")

    if user.password_hash[:16] != payload.get("phash"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link has already been used")

    user.password_hash = get_password_hash(body.new_password)
    await db.flush()


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


# ── Me ────────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
