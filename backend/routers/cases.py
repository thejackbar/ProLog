import math
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models import Case, User
from schemas import (
    BulkDeleteRequest,
    CaseCreate,
    CaseListResponse,
    CaseResponse,
    CaseUpdate,
)

router = APIRouter(prefix="/api/cases", tags=["cases"], redirect_slashes=False)

ART_PREGNANCY_CHECK_OFFSET = timedelta(days=14)


def _apply_pregnancy_check(case: Case) -> None:
    """Set pregnancy_check_date for ART cases where pregnancy outcome is unanswered (None)."""
    if (
        case.category == "ART"
        and case.pregnant is None
        and case.case_date is not None
    ):
        case.pregnancy_check_date = case.case_date + ART_PREGNANCY_CHECK_OFFSET
    else:
        case.pregnancy_check_date = None


# ── List cases ────────────────────────────────────────────────────────────────
@router.get("", response_model=CaseListResponse)
async def list_cases(
    search: str | None = Query(None, description="Search patient_id, hospital, obs"),
    category: str | None = Query(None),
    procedure: str | None = Query(None),
    pregnant: bool | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CaseListResponse:
    filters = [Case.user_id == current_user.id]

    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Case.patient_id.ilike(term),
                Case.hospital.ilike(term),
                Case.obs.ilike(term),
                Case.outcome.ilike(term),
            )
        )
    if category:
        filters.append(Case.category == category)
    if procedure:
        filters.append(
            or_(
                Case.procedure.ilike(f"%{procedure}%"),
                Case.type.ilike(f"%{procedure}%"),
                Case.detail.ilike(f"%{procedure}%"),
            )
        )
    if date_from:
        filters.append(Case.case_date >= date_from)
    if date_to:
        filters.append(Case.case_date <= date_to)
    if pregnant is not None:
        filters.append(Case.pregnant == pregnant)

    where_clause = and_(*filters)

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(Case).where(where_clause)
    )
    total: int = count_result.scalar_one()

    # Paginated rows
    offset = (page - 1) * per_page
    rows_result = await db.execute(
        select(Case)
        .where(where_clause)
        .order_by(Case.case_date.desc().nullslast(), Case.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    cases = rows_result.scalars().all()

    return CaseListResponse(
        cases=[CaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, math.ceil(total / per_page)),
    )


# ── Get single case ───────────────────────────────────────────────────────────
@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Case:
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


# ── Create case ───────────────────────────────────────────────────────────────
@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Case:
    case = Case(
        user_id=current_user.id,
        **body.model_dump(),
    )
    _apply_pregnancy_check(case)
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


# ── Update case ───────────────────────────────────────────────────────────────
@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    body: CaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Case:
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    _apply_pregnancy_check(case)
    await db.flush()
    await db.refresh(case)
    return case


# ── Delete single case ────────────────────────────────────────────────────────
@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    await db.delete(case)


# ── Bulk delete ───────────────────────────────────────────────────────────────
@router.delete("/bulk", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_cases(
    body: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        delete(Case).where(
            Case.id.in_(body.ids),
            Case.user_id == current_user.id,
        )
    )


# ── Bulk delete (POST for compatibility) ──────────────────────────────────────
@router.post("/bulk-delete", status_code=204)
async def bulk_delete_cases_post(
    body: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        delete(Case).where(
            Case.id.in_(body.ids),
            Case.user_id == current_user.id,
        )
    )
