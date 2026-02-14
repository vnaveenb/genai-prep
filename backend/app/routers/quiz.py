"""
Quiz router — generate quizzes, submit answers, view history.
"""

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.quiz_attempt import QuizAttempt
from app.schemas.schemas import (
    QuizGenerateRequest,
    QuizQuestion,
    QuizSubmitRequest,
    QuizResult,
    QuizHistoryItem,
    LLMConfig,
)
from app.services.quiz_generator import generate_static_quiz, generate_ai_quiz

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])


@router.post("/generate", response_model=list[QuizQuestion])
async def generate_quiz(request: QuizGenerateRequest):
    """Generate a quiz for a given section."""
    if request.mode == "static":
        questions = generate_static_quiz(
            section=request.section,
            count=request.count,
            topic=request.topic,
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="AI quiz mode requires LLM config. Use /generate-ai endpoint."
        )

    if not questions:
        raise HTTPException(status_code=404, detail=f"No questions generated for section '{request.section}'")

    return questions


@router.post("/generate-ai", response_model=list[QuizQuestion])
async def generate_ai_quiz_endpoint(request: QuizGenerateRequest, llm_config: LLMConfig):
    """Generate AI-powered quiz questions using LLM."""
    try:
        questions = await generate_ai_quiz(
            section=request.section,
            count=request.count,
            difficulty=request.difficulty,
            topic=request.topic,
            llm_config=llm_config,
        )
        return questions
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/submit", response_model=QuizResult)
async def submit_quiz(request: QuizSubmitRequest, db: AsyncSession = Depends(get_db)):
    """Submit quiz answers and get results."""
    results = []
    correct_count = 0

    for answer in request.answers:
        is_correct = answer.get("selected_answer") == answer.get("correct_answer")
        if is_correct:
            correct_count += 1

        attempt = QuizAttempt(
            session_id=request.session_id,
            section=answer.get("section", ""),
            topic=answer.get("topic"),
            question=answer.get("question", ""),
            options=json.dumps(answer.get("options")) if answer.get("options") else None,
            selected_answer=answer.get("selected_answer"),
            correct_answer=answer.get("correct_answer", ""),
            is_correct=is_correct,
            explanation=answer.get("explanation"),
            question_type=answer.get("question_type", "mcq"),
            time_taken_seconds=answer.get("time_taken_seconds"),
        )
        db.add(attempt)
        results.append({
            "question": answer.get("question", ""),
            "selected_answer": answer.get("selected_answer"),
            "correct_answer": answer.get("correct_answer"),
            "is_correct": is_correct,
            "explanation": answer.get("explanation"),
        })

    total = len(request.answers)
    score_pct = (correct_count / total * 100) if total > 0 else 0

    return QuizResult(
        session_id=request.session_id,
        total_questions=total,
        correct_answers=correct_count,
        score_percentage=round(score_pct, 1),
        results=results,
    )


@router.get("/history", response_model=list[QuizHistoryItem])
async def get_quiz_history(db: AsyncSession = Depends(get_db)):
    """Get quiz session history."""
    stmt = (
        select(
            QuizAttempt.session_id,
            QuizAttempt.section,
            QuizAttempt.topic,
            func.count(QuizAttempt.id).label("total"),
            func.sum(QuizAttempt.is_correct.cast(int)).label("correct"),
            func.min(QuizAttempt.created_at).label("created_at"),
        )
        .group_by(QuizAttempt.session_id, QuizAttempt.section, QuizAttempt.topic)
        .order_by(func.min(QuizAttempt.created_at).desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        QuizHistoryItem(
            session_id=r.session_id,
            section=r.section,
            topic=r.topic,
            total_questions=r.total,
            correct_answers=r.correct or 0,
            score_percentage=round((r.correct or 0) / r.total * 100, 1) if r.total > 0 else 0,
            created_at=r.created_at,
        )
        for r in rows
    ]
