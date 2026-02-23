from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, get_password_hash, verify_password
from database import get_db
from models import Hospital, Qualification, User
from schemas import (
    HospitalCreate,
    HospitalResponse,
    PasswordChange,
    QualificationCreate,
    QualificationResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    update_data = body.model_dump(exclude_unset=True)

    if "username" in update_data and update_data["username"] != current_user.username:
        dup = await db.execute(
            select(User).where(User.username == update_data["username"].lower(), User.id != current_user.id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already taken")
        update_data["username"] = update_data["username"].lower()

    if "email" in update_data and update_data["email"] != current_user.email:
        dup = await db.execute(
            select(User).where(User.email == update_data["email"], User.id != current_user.id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already in use")

    for field, value in update_data.items():
        setattr(current_user, field, value)

    first = update_data.get("first_name", current_user.first_name) or ""
    last = update_data.get("last_name", current_user.last_name) or ""
    if first or last:
        current_user.full_name = f"{first} {last}".strip()

    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204)
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = get_password_hash(body.new_password)
    await db.flush()


@router.get("/qualifications", response_model=list[QualificationResponse])
async def list_qualifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Qualification]:
    result = await db.execute(
        select(Qualification).where(Qualification.user_id == current_user.id)
        .order_by(Qualification.date_obtained.desc().nullslast(), Qualification.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/qualifications", response_model=list[QualificationResponse], status_code=201)
async def add_qualification(
    body: QualificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Qualification]:
    qual = Qualification(user_id=current_user.id, name=body.name, date_obtained=body.date_obtained)
    db.add(qual)
    await db.flush()
    result = await db.execute(
        select(Qualification).where(Qualification.user_id == current_user.id)
        .order_by(Qualification.date_obtained.desc().nullslast(), Qualification.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/qualifications/{qual_id}", response_model=list[QualificationResponse])
async def delete_qualification(
    qual_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Qualification]:
    result = await db.execute(
        select(Qualification).where(Qualification.id == qual_id, Qualification.user_id == current_user.id)
    )
    qual = result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualification not found")
    await db.delete(qual)
    await db.flush()
    result = await db.execute(
        select(Qualification).where(Qualification.user_id == current_user.id)
        .order_by(Qualification.date_obtained.desc().nullslast(), Qualification.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/hospitals", response_model=list[HospitalResponse])
async def list_hospitals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Hospital]:
    result = await db.execute(
        select(Hospital).where(Hospital.user_id == current_user.id).order_by(Hospital.name)
    )
    return list(result.scalars().all())


@router.post("/hospitals", response_model=HospitalResponse, status_code=201)
async def add_hospital(
    body: HospitalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Hospital:
    existing_result = await db.execute(
        select(Hospital).where(Hospital.user_id == current_user.id, Hospital.name == body.name)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return existing
    hospital = Hospital(user_id=current_user.id, name=body.name)
    db.add(hospital)
    await db.flush()
    await db.refresh(hospital)
    return hospital
