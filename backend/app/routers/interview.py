"""
Interview router — AI-powered mock interviews with SSE streaming.
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.quiz_attempt import InterviewSession
from app.schemas.schemas import (
    InterviewStartRequest,
    InterviewMessageRequest,
    InterviewEndRequest,
    InterviewSessionResponse,
    InterviewMessage,
    LLMConfig,
    TestConnectionRequest,
)
from app.services.interview_engine import (
    create_session,
    get_session,
    start_interview,
    stream_start_interview,
    get_interviewer_response,
    stream_interviewer_response,
    evaluate_interview,
    get_session_messages,
    cleanup_session,
)
from app.services.llm_service import test_connection

router = APIRouter(prefix="/api/interview", tags=["Interview"])


@router.post("/test-connection")
async def test_llm_connection(request: TestConnectionRequest):
    """Test LLM provider connection."""
    result = await test_connection(request.llm_config)
    return result


@router.post("/start")
async def start_interview_session(
    request: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a new mock interview session."""
    session = create_session(
        interview_type=request.interview_type,
        difficulty=request.difficulty,
        num_questions=request.num_questions,
    )

    # Save to DB
    db_session = InterviewSession(
        session_id=session["session_id"],
        interview_type=request.interview_type,
        provider=request.llm_config.provider,
        model=request.llm_config.model,
        status="active",
    )
    db.add(db_session)

    # Get interviewer's opening message
    opening = await start_interview(session["session_id"], request.llm_config)

    return {
        "session_id": session["session_id"],
        "interview_type": request.interview_type,
        "status": "active",
        "opening_message": opening,
    }


@router.post("/start-stream")
async def start_interview_stream(
    request: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a new interview with SSE streaming for the opening message."""
    session = create_session(
        interview_type=request.interview_type,
        difficulty=request.difficulty,
        num_questions=request.num_questions,
    )

    db_session = InterviewSession(
        session_id=session["session_id"],
        interview_type=request.interview_type,
        provider=request.llm_config.provider,
        model=request.llm_config.model,
        status="active",
    )
    db.add(db_session)
    await db.flush()

    async def event_generator():
        # First send the session_id
        yield f"data: {json.dumps({'type': 'session_id', 'content': session['session_id']})}\n\n"

        async for token in stream_start_interview(session["session_id"], request.llm_config):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/message")
async def send_message(request: InterviewMessageRequest):
    """Send a message and get the interviewer's response."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    response = await get_interviewer_response(
        request.session_id, request.message, request.llm_config
    )

    return {
        "session_id": request.session_id,
        "response": response,
        "status": session.get("status", "active"),
    }


@router.post("/message-stream")
async def send_message_stream(request: InterviewMessageRequest):
    """Send a message and stream the interviewer's response via SSE."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    async def event_generator():
        async for token in stream_interviewer_response(
            request.session_id, request.message, request.llm_config
        ):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # Send final status
        updated_session = get_session(request.session_id)
        status = updated_session.get("status", "active") if updated_session else "active"
        yield f"data: {json.dumps({'type': 'done', 'content': '', 'status': status})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/evaluate")
async def evaluate_interview_session(
    request: InterviewEndRequest,
    db: AsyncSession = Depends(get_db),
):
    """Evaluate a completed interview session."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    evaluation = await evaluate_interview(request.session_id, request.llm_config)

    # Update DB
    stmt = select(InterviewSession).where(InterviewSession.session_id == request.session_id)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    if db_session:
        db_session.status = "completed"
        db_session.completed_at = datetime.utcnow()
        db_session.evaluation = json.dumps(evaluation.model_dump())
        db_session.score = evaluation.overall_score
        messages = get_session_messages(request.session_id)
        db_session.messages = json.dumps(messages)

    return {
        "session_id": request.session_id,
        "evaluation": evaluation.model_dump(),
    }


@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all interview sessions."""
    stmt = (
        select(InterviewSession)
        .order_by(InterviewSession.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        {
            "session_id": s.session_id,
            "interview_type": s.interview_type,
            "provider": s.provider,
            "model": s.model,
            "status": s.status,
            "score": s.score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get details of a specific interview session."""
    stmt = select(InterviewSession).where(InterviewSession.session_id == session_id)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": db_session.session_id,
        "interview_type": db_session.interview_type,
        "provider": db_session.provider,
        "model": db_session.model,
        "status": db_session.status,
        "score": db_session.score,
        "messages": json.loads(db_session.messages) if db_session.messages else [],
        "evaluation": json.loads(db_session.evaluation) if db_session.evaluation else None,
        "created_at": db_session.created_at.isoformat() if db_session.created_at else None,
        "completed_at": db_session.completed_at.isoformat() if db_session.completed_at else None,
    }
