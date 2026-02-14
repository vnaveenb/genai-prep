from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "GenAI Interview Prep"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./genai_prep.db"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Content
    GENAI_JSON_PATH: str = str(
        Path(__file__).parent.parent.parent / "genai.json"
    )

    # Encryption key for API keys at rest (generate a real one in production)
    ENCRYPTION_KEY: str = "default-dev-key-change-in-production-32b"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
