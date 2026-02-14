"""
Content router — serves genai.json sections as structured API endpoints.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.content_loader import content_loader
from app.schemas.schemas import ContentSection, ContentItem, FlashCard, InterviewCategory

router = APIRouter(prefix="/api/content", tags=["Content"])


@router.get("/interview-questions", response_model=list[InterviewCategory])
async def get_interview_questions():
    """Get all interview questions grouped by category with short and detailed answers."""
    return content_loader.get_interview_questions()


@router.get("/sections", response_model=list[ContentSection])
async def list_sections():
    """List all available content sections with item counts."""
    return content_loader.sections


@router.get("/sections/{section_key}/items", response_model=list[ContentItem])
async def get_section_items(section_key: str):
    """Get all items for a specific section."""
    items = content_loader.get_items(section_key)
    if not items:
        raise HTTPException(status_code=404, detail=f"Section '{section_key}' not found or empty")
    return items


@router.get("/items/{item_id:path}", response_model=ContentItem)
async def get_item(item_id: str):
    """Get a single content item by its composite ID."""
    item = content_loader.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")
    return item


@router.get("/flashcards", response_model=list[FlashCard])
async def get_flashcards(section: str | None = Query(None, description="Filter by section key")):
    """Get flashcards, optionally filtered by section."""
    cards = content_loader.get_flashcards(section)
    if section and not cards:
        raise HTTPException(status_code=404, detail=f"No flashcards found for section '{section}'")
    return cards


@router.get("/stats")
async def get_content_stats():
    """Get overall content statistics."""
    sections = content_loader.sections
    return {
        "total_sections": len(sections),
        "total_items": len(content_loader.all_items),
        "total_flashcards": len(content_loader.all_flashcards),
        "sections": [
            {
                "key": s.section_key,
                "title": s.title,
                "item_count": s.item_count,
            }
            for s in sections
        ],
    }


@router.get("/search")
async def search_content(q: str = Query(..., min_length=2, description="Search query")):
    """Search across all content items."""
    query = q.lower()
    results = []
    for item in content_loader.all_items:
        if (query in item.title.lower()
                or (item.subtitle and query in item.subtitle.lower())
                or (item.detail and query in item.detail.lower())):
            results.append(item)
    return results[:50]  # Limit results
