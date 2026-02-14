import datetime
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, default="default")

    # Encrypted API keys (optional persistence)
    gemini_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    openai_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    anthropic_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    ollama_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True, default="http://localhost:11434")

    preferred_provider: Mapped[str | None] = mapped_column(String(50), nullable=True, default="gemini")
    preferred_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
