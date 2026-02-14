"""
Notes router — CRUD for personal notes and bookmarks on any content item.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.note import Note
from app.schemas.schemas import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter(prefix="/api/notes", tags=["Notes"])


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    section: str | None = Query(None),
    bookmarked_only: bool = Query(False),
    search: str | None = Query(None, min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """List notes, optionally filtered."""
    stmt = select(Note)
    if section:
        stmt = stmt.where(Note.section == section)
    if bookmarked_only:
        stmt = stmt.where(Note.is_bookmarked == True)
    if search:
        stmt = stmt.where(Note.content.ilike(f"%{search}%"))
    stmt = stmt.order_by(Note.updated_at.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{item_id:path}", response_model=NoteResponse)
async def get_note(item_id: str, db: AsyncSession = Depends(get_db)):
    """Get note for a specific item."""
    stmt = select(Note).where(Note.item_id == item_id)
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail=f"No note found for '{item_id}'")
    return note


@router.post("/", response_model=NoteResponse)
async def create_or_update_note(data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """Create or update a note for an item."""
    stmt = select(Note).where(Note.item_id == data.item_id)
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()

    if note:
        if data.content is not None:
            note.content = data.content
        note.is_bookmarked = data.is_bookmarked
    else:
        note = Note(
            item_id=data.item_id,
            section=data.section,
            content=data.content,
            is_bookmarked=data.is_bookmarked,
        )
        db.add(note)

    await db.flush()
    await db.refresh(note)
    return note


@router.patch("/{item_id:path}", response_model=NoteResponse)
async def update_note(item_id: str, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    """Partially update a note."""
    stmt = select(Note).where(Note.item_id == item_id)
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail=f"No note found for '{item_id}'")

    if data.content is not None:
        note.content = data.content
    if data.is_bookmarked is not None:
        note.is_bookmarked = data.is_bookmarked

    await db.flush()
    await db.refresh(note)
    return note


@router.delete("/{item_id:path}")
async def delete_note(item_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a note."""
    stmt = select(Note).where(Note.item_id == item_id)
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail=f"No note found for '{item_id}'")

    await db.delete(note)
    return {"status": "deleted", "item_id": item_id}


@router.post("/bookmark/{item_id:path}", response_model=NoteResponse)
async def toggle_bookmark(item_id: str, section: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Toggle bookmark status for an item."""
    stmt = select(Note).where(Note.item_id == item_id)
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()

    if note:
        note.is_bookmarked = not note.is_bookmarked
    else:
        note = Note(
            item_id=item_id,
            section=section,
            is_bookmarked=True,
        )
        db.add(note)

    await db.flush()
    await db.refresh(note)
    return note
