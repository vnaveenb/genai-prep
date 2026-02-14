"""
Progress router — CRUD for tracking learning progress across all content items.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.database import get_db
from app.models.progress import Progress
from app.schemas.schemas import (
    ProgressCreate,
    ProgressUpdate,
    ProgressResponse,
    SectionProgress,
    OverallProgress,
)
from app.services.content_loader import content_loader

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.get("/overview", response_model=OverallProgress)
async def get_progress_overview(db: AsyncSession = Depends(get_db)):
    """Get overall progress across all sections."""
    total_items = len(content_loader.all_items)

    # Get progress stats from DB
    stmt = select(
        func.count(Progress.id).label("total_tracked"),
        func.sum(case((Progress.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((Progress.status == "in_progress", 1), else_=0)).label("in_progress"),
        func.avg(Progress.confidence).label("avg_confidence"),
    )
    result = await db.execute(stmt)
    row = result.first()

    completed = int(row.completed or 0)
    in_progress = int(row.in_progress or 0)
    avg_confidence = float(row.avg_confidence or 0)
    not_started = total_items - completed - in_progress

    # Per-section stats
    sections = []
    for sec in content_loader.sections:
        sec_stmt = select(
            func.count(Progress.id).label("total"),
            func.sum(case((Progress.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((Progress.status == "in_progress", 1), else_=0)).label("in_progress"),
            func.avg(Progress.confidence).label("avg_confidence"),
        ).where(Progress.section == sec.section_key)
        sec_result = await db.execute(sec_stmt)
        sec_row = sec_result.first()

        sec_completed = int(sec_row.completed or 0)
        sec_in_progress = int(sec_row.in_progress or 0)
        sec_not_started = sec.item_count - sec_completed - sec_in_progress

        sections.append(SectionProgress(
            section=sec.section_key,
            total=sec.item_count,
            completed=sec_completed,
            in_progress=sec_in_progress,
            not_started=max(0, sec_not_started),
            average_confidence=round(float(sec_row.avg_confidence or 0), 1),
            completion_percentage=round(sec_completed / sec.item_count * 100, 1) if sec.item_count > 0 else 0,
        ))

    # Days active (distinct dates with activity)
    active_stmt = select(
        func.count(func.date(Progress.updated_at).distinct())
    )
    active_result = await db.execute(active_stmt)
    days_active = active_result.scalar() or 0

    # Current streak (consecutive days)
    streak = await _calculate_streak(db)

    return OverallProgress(
        total_items=total_items,
        completed=completed,
        in_progress=in_progress,
        not_started=max(0, not_started),
        overall_completion=round(completed / total_items * 100, 1) if total_items > 0 else 0,
        average_confidence=round(avg_confidence, 1),
        sections=sections,
        days_active=days_active,
        current_streak=streak,
    )


@router.get("/items", response_model=list[ProgressResponse])
async def list_progress(
    section: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List progress records, optionally filtered by section and status."""
    stmt = select(Progress)
    if section:
        stmt = stmt.where(Progress.section == section)
    if status:
        stmt = stmt.where(Progress.status == status)
    stmt = stmt.order_by(Progress.updated_at.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/items/{item_id:path}", response_model=ProgressResponse)
async def get_progress(item_id: str, db: AsyncSession = Depends(get_db)):
    """Get progress for a specific item."""
    stmt = select(Progress).where(Progress.item_id == item_id)
    result = await db.execute(stmt)
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail=f"No progress found for '{item_id}'")
    return progress


@router.post("/items", response_model=ProgressResponse)
async def create_or_update_progress(data: ProgressCreate, db: AsyncSession = Depends(get_db)):
    """Create or update progress for an item."""
    stmt = select(Progress).where(Progress.item_id == data.item_id)
    result = await db.execute(stmt)
    progress = result.scalar_one_or_none()

    now = datetime.utcnow()
    if progress:
        progress.status = data.status
        progress.confidence = data.confidence
        progress.times_reviewed = progress.times_reviewed + 1
        progress.last_reviewed_at = now
        if data.status == "completed":
            progress.completed_at = now
    else:
        progress = Progress(
            item_id=data.item_id,
            section=data.section,
            status=data.status,
            confidence=data.confidence,
            times_reviewed=1,
            last_reviewed_at=now,
            completed_at=now if data.status == "completed" else None,
        )
        db.add(progress)

    await db.flush()
    await db.refresh(progress)
    return progress


@router.patch("/items/{item_id:path}", response_model=ProgressResponse)
async def update_progress(item_id: str, data: ProgressUpdate, db: AsyncSession = Depends(get_db)):
    """Partially update progress for an item."""
    stmt = select(Progress).where(Progress.item_id == item_id)
    result = await db.execute(stmt)
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail=f"No progress found for '{item_id}'")

    now = datetime.utcnow()
    if data.status is not None:
        progress.status = data.status
        if data.status == "completed":
            progress.completed_at = now
    if data.confidence is not None:
        progress.confidence = data.confidence

    progress.times_reviewed = progress.times_reviewed + 1
    progress.last_reviewed_at = now

    await db.flush()
    await db.refresh(progress)
    return progress


@router.post("/batch")
async def batch_update_progress(items: list[ProgressCreate], db: AsyncSession = Depends(get_db)):
    """Batch create/update progress for multiple items."""
    results = []
    now = datetime.utcnow()

    for data in items:
        stmt = select(Progress).where(Progress.item_id == data.item_id)
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        if progress:
            progress.status = data.status
            progress.confidence = data.confidence
            progress.times_reviewed = progress.times_reviewed + 1
            progress.last_reviewed_at = now
            if data.status == "completed":
                progress.completed_at = now
        else:
            progress = Progress(
                item_id=data.item_id,
                section=data.section,
                status=data.status,
                confidence=data.confidence,
                times_reviewed=1,
                last_reviewed_at=now,
                completed_at=now if data.status == "completed" else None,
            )
            db.add(progress)

        results.append(data.item_id)

    return {"updated": len(results), "item_ids": results}


async def _calculate_streak(db: AsyncSession) -> int:
    """Calculate the current consecutive-day streak."""
    date_col = func.date(Progress.updated_at).label("activity_date")
    stmt = (
        select(date_col)
        .group_by(date_col)
        .order_by(date_col.desc())
    )
    result = await db.execute(stmt)
    dates = [r[0] for r in result.all()]

    if not dates:
        return 0

    today = datetime.utcnow().date()
    streak = 0
    expected = today

    for d in dates:
        if d == expected:
            streak += 1
            expected = d - timedelta(days=1)
        elif d == expected - timedelta(days=1):
            # Allow gap of one day (yesterday might not have been tracked yet today)
            expected = d - timedelta(days=1)
            streak += 1
        else:
            break

    return streak
