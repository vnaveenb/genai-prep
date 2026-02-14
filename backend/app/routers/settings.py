"""
Settings router — manage user preferences and API keys.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.schemas import UserSettingsUpdate, UserSettingsResponse
from app.utils.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/api/settings", tags=["Settings"])


async def _get_or_create_user(db: AsyncSession) -> User:
    """Get the default user or create one."""
    stmt = select(User).where(User.username == "default")
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        user = User(username="default")
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return user


@router.get("/", response_model=UserSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current user settings (API keys are not returned, only presence flags)."""
    user = await _get_or_create_user(db)
    return UserSettingsResponse(
        preferred_provider=user.preferred_provider,
        preferred_model=user.preferred_model,
        has_gemini_key=bool(user.gemini_api_key),
        has_openai_key=bool(user.openai_api_key),
        has_anthropic_key=bool(user.anthropic_api_key),
        ollama_base_url=user.ollama_base_url,
    )


@router.put("/")
async def update_settings(data: UserSettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Update user settings."""
    user = await _get_or_create_user(db)

    if data.preferred_provider is not None:
        user.preferred_provider = data.preferred_provider
    if data.preferred_model is not None:
        user.preferred_model = data.preferred_model
    if data.gemini_api_key is not None:
        user.gemini_api_key = encrypt_value(data.gemini_api_key) if data.gemini_api_key else None
    if data.openai_api_key is not None:
        user.openai_api_key = encrypt_value(data.openai_api_key) if data.openai_api_key else None
    if data.anthropic_api_key is not None:
        user.anthropic_api_key = encrypt_value(data.anthropic_api_key) if data.anthropic_api_key else None
    if data.ollama_base_url is not None:
        user.ollama_base_url = data.ollama_base_url

    await db.flush()
    await db.refresh(user)

    return {
        "status": "updated",
        "preferred_provider": user.preferred_provider,
        "preferred_model": user.preferred_model,
    }


@router.get("/api-key/{provider}")
async def get_stored_api_key(provider: str, db: AsyncSession = Depends(get_db)):
    """Retrieve stored (encrypted) API key for a provider. Returns decrypted key."""
    user = await _get_or_create_user(db)

    key_map = {
        "gemini": user.gemini_api_key,
        "openai": user.openai_api_key,
        "anthropic": user.anthropic_api_key,
    }

    if provider == "ollama":
        return {"provider": "ollama", "base_url": user.ollama_base_url}

    encrypted_key = key_map.get(provider)
    if not encrypted_key:
        raise HTTPException(status_code=404, detail=f"No API key stored for {provider}")

    try:
        decrypted = decrypt_value(encrypted_key)
        # Return masked key (show first 8 and last 4 chars)
        masked = decrypted[:8] + "..." + decrypted[-4:] if len(decrypted) > 12 else "***"
        return {"provider": provider, "key_preview": masked, "has_key": True}
    except Exception:
        return {"provider": provider, "has_key": True, "key_preview": "***"}


@router.delete("/api-key/{provider}")
async def delete_api_key(provider: str, db: AsyncSession = Depends(get_db)):
    """Delete stored API key for a provider."""
    user = await _get_or_create_user(db)

    if provider == "gemini":
        user.gemini_api_key = None
    elif provider == "openai":
        user.openai_api_key = None
    elif provider == "anthropic":
        user.anthropic_api_key = None
    elif provider == "ollama":
        user.ollama_base_url = "http://localhost:11434"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    return {"status": "deleted", "provider": provider}
