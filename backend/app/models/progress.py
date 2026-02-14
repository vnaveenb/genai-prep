import datetime
from sqlalchemy import String, Integer, DateTime, Float, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(200), index=True)  # e.g. "research_papers:1"
    section: Mapped[str] = mapped_column(String(100), index=True)  # e.g. "research_papers"
    status: Mapped[str] = mapped_column(String(20), default="not_started")  # not_started, in_progress, completed
    confidence: Mapped[int] = mapped_column(Integer, default=0)  # 0-5 scale
    times_reviewed: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
