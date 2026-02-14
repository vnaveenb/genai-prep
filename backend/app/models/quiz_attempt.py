import datetime
from sqlalchemy import String, Text, Boolean, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), index=True)  # groups questions per quiz session
    section: Mapped[str] = mapped_column(String(100))
    topic: Mapped[str | None] = mapped_column(String(200), nullable=True)
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of options
    selected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    question_type: Mapped[str] = mapped_column(String(20), default="mcq")  # mcq, open_ended
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    interview_type: Mapped[str] = mapped_column(String(50))  # python, system_design, genai, ml, mixed
    provider: Mapped[str] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    messages: Mapped[str] = mapped_column(Text, default="[]")  # JSON conversation history
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    evaluation: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON evaluation report
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, completed
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
