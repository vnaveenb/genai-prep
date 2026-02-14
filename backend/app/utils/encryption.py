"""
Encryption utilities for API keys stored at rest in SQLite.
Uses Fernet symmetric encryption from the cryptography library.
"""

from cryptography.fernet import Fernet
import base64
import hashlib

from app.config import settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the configured encryption key."""
    key = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key)
    return Fernet(fernet_key)


def encrypt_value(value: str) -> str:
    """Encrypt a string value and return base64-encoded ciphertext."""
    if not value:
        return ""
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a base64-encoded ciphertext and return plaintext."""
    if not encrypted_value:
        return ""
    f = _get_fernet()
    return f.decrypt(encrypted_value.encode()).decode()
