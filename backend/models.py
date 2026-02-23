import uuid
from datetime import datetime, date
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    clinical_role: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cases: Mapped[list["Case"]] = relationship(
        "Case", back_populates="user", cascade="all, delete-orphan"
    )
    qualifications: Mapped[list["Qualification"]] = relationship(
        "Qualification", back_populates="user", cascade="all, delete-orphan"
    )
    hospitals: Mapped[list["Hospital"]] = relationship(
        "Hospital", back_populates="user", cascade="all, delete-orphan"
    )


# ── Case ──────────────────────────────────────────────────────────────────────
class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Patient / encounter fields
    patient_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    case_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    hospital: Mapped[str | None] = mapped_column(String(255), nullable=True)
    clinical_role: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Procedure hierarchy
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    procedure: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    detail: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Clinical narrative
    obs: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Obstetrics-specific
    pregnant: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    complications: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, default=list
    )
    prev_cs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sterilisation: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    # ART-specific
    pregnancy_check_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    oocyte_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    et_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Catch-all extension field
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cases")


# ── Qualification ─────────────────────────────────────────────────────────────
class Qualification(Base):
    __tablename__ = "qualifications"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_obtained: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="qualifications")


# ── Hospital ──────────────────────────────────────────────────────────────────
class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_hospital_user_name"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="hospitals")
