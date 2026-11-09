from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    key = settings.whatsapp_encryption_key
    if not key:
        raise RuntimeError("WHATSAPP_ENCRYPTION_KEY no configurada")
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    b64_key = base64.urlsafe_b64encode(digest)
    return Fernet(b64_key)


def encrypt_secret(value: str) -> str:
    return _get_fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str) -> str:
    return _get_fernet().decrypt(value.encode("ascii")).decode("utf-8")
