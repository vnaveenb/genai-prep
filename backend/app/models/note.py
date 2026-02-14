import datetime
from sqlalchemy import String, Text, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(200), index=True)
    section: Mapped[str] = mapped_column(String(100), index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_bookmarked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
