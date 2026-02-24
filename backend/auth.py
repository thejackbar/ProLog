import asyncio
import hashlib
import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import bcrypt
from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import User

log = logging.getLogger(__name__)

# ── Password hashing ──────────────────────────────────────────────────────────
def _prepare_password(plain: str) -> bytes:
    """SHA-256 pre-hash so bcrypt's 72-byte limit is never hit."""
    return hashlib.sha256(plain.encode()).hexdigest().encode()


def verify_password(plain: str, hashed: str) -> bool:
    # Try current method (sha256 pre-hash) first
    if bcrypt.checkpw(_prepare_password(plain), hashed.encode()):
        return True
    # Fall back to legacy method (no pre-hash) for users registered before fadebbe
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def get_password_hash(plain: str) -> str:
    return bcrypt.hashpw(_prepare_password(plain), bcrypt.gensalt()).decode()


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_EXPIRY_DAYS)

    expire = datetime.now(timezone.utc) + expires_delta

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── Current-user dependency ───────────────────────────────────────────────────
async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_access_token(access_token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


# ── Password reset tokens ──────────────────────────────────────────────────────
def create_reset_token(user_id: str, password_hash: str) -> str:
    """Create a 1-hour JWT reset token that invalidates once the password changes."""
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload: dict[str, Any] = {
        "sub": user_id,
        "purpose": "password_reset",
        "phash": password_hash[:16],
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_reset_token(token: str) -> dict[str, Any]:
    """Decode and validate a reset token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
    return payload


# ── Email sending ──────────────────────────────────────────────────────────────
async def send_reset_email(to_email: str, full_name: str, reset_url: str) -> None:
    """Send a password reset email. Falls back to logging if SMTP is not configured."""
    if not settings.SMTP_HOST:
        log.warning("SMTP not configured — password reset URL for %s: %s", to_email, reset_url)
        return

    first_name = full_name.split()[0] if full_name else "there"

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:#2563eb">Reset your ProLog password</h2>
      <p>Hi {first_name},</p>
      <p>We received a request to reset the password for your ProLog account.</p>
      <p style="margin:28px 0">
        <a href="{reset_url}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;
                  text-decoration:none;font-weight:600">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">
        This link expires in <strong>1 hour</strong>.<br>
        If you didn't request a reset, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:12px">ProLog · Fertility &amp; Gynaecology Clinical Case Logbook</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your ProLog password"
    msg["From"] = settings.FROM_EMAIL or settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(f"Reset your password: {reset_url}\n\nThis link expires in 1 hour.", "plain"))
    msg.attach(MIMEText(html, "html"))

    def _send() -> None:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
            smtp.send_message(msg)

    try:
        await asyncio.get_event_loop().run_in_executor(None, _send)
    except Exception as exc:
        log.error("Failed to send reset email to %s: %s", to_email, exc)
