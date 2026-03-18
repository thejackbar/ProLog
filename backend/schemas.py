from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ── Shared helpers ────────────────────────────────────────────────────────────
class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# USER schemas
# ═══════════════════════════════════════════════════════════════════════════════
class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    password: str = Field(..., min_length=6)
    clinical_role: str | None = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @field_validator("username")
    @classmethod
    def lower_username(cls, v: str) -> str:
        return v.lower()


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    username: str | None = Field(None, min_length=3, max_length=100)
    email: EmailStr | None = None
    clinical_role: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserResponse(OrmBase):
    id: str
    full_name: str
    first_name: str | None
    last_name: str | None
    username: str
    email: str
    clinical_role: str | None
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# CASE schemas
# ═══════════════════════════════════════════════════════════════════════════════
class CaseCreate(BaseModel):
    patient_id: str | None = None
    case_date: date | None = None
    hospital: str | None = None
    clinical_role: str | None = None

    category: str | None = None
    type: str | None = None
    procedure: str | None = None
    detail: str | None = None

    obs: str | None = None
    outcome: str | None = None

    pregnant: bool | None = None
    complications: list[str] | None = Field(default_factory=list)
    prev_cs: int | None = Field(None, ge=0)
    sterilisation: bool | None = False

    # ART fields
    oocyte_data: dict[str, Any] | None = None
    et_data: dict[str, Any] | None = None

    # Extension
    extra_data: dict[str, Any] | None = None


class CaseUpdate(BaseModel):
    patient_id: str | None = None
    case_date: date | None = None
    hospital: str | None = None
    clinical_role: str | None = None

    category: str | None = None
    type: str | None = None
    procedure: str | None = None
    detail: str | None = None

    obs: str | None = None
    outcome: str | None = None

    pregnant: bool | None = None
    complications: list[str] | None = None
    prev_cs: int | None = Field(None, ge=0)
    sterilisation: bool | None = None

    oocyte_data: dict[str, Any] | None = None
    et_data: dict[str, Any] | None = None
    extra_data: dict[str, Any] | None = None


class CaseResponse(OrmBase):
    id: str
    user_id: str
    patient_id: str | None
    case_date: date | None
    hospital: str | None
    clinical_role: str | None

    category: str | None
    type: str | None
    procedure: str | None
    detail: str | None

    obs: str | None
    outcome: str | None

    pregnant: bool | None
    complications: list[str] | None
    prev_cs: int | None
    sterilisation: bool | None
    pregnancy_check_date: date | None

    oocyte_data: dict[str, Any] | None
    et_data: dict[str, Any] | None
    extra_data: dict[str, Any] | None

    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int
    page: int
    per_page: int
    pages: int


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)


# ═══════════════════════════════════════════════════════════════════════════════
# QUALIFICATION schemas
# ═══════════════════════════════════════════════════════════════════════════════
class QualificationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    date_obtained: date | None = None


class QualificationResponse(OrmBase):
    id: str
    user_id: str
    name: str
    date_obtained: date | None
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# HOSPITAL schemas
# ═══════════════════════════════════════════════════════════════════════════════
class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class HospitalResponse(OrmBase):
    id: str
    user_id: str
    name: str
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH schemas
# ═══════════════════════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ═══════════════════════════════════════════════════════════════════════════════
# AI schemas
# ═══════════════════════════════════════════════════════════════════════════════
class AIAnalyzeRequest(BaseModel):
    cases: list[dict[str, Any]]
    prompt_type: str = "patterns"


class AIAnalyzeResponse(BaseModel):
    analysis: str
