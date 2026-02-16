"""Authentication helpers. Currently allows anonymous access."""

import hashlib
import hmac
import os
import time
from typing import Any

from fastapi import Request

from storage import storage

TELEGRAM_BOT_TOKEN: str | None = os.environ.get("TELEGRAM_BOT_TOKEN")


def verify_telegram_auth(data: dict[str, str]) -> bool:
    """Verify Telegram Login Widget callback data."""
    if not TELEGRAM_BOT_TOKEN:
        return False
    check_hash = data.pop("hash", "")
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items())
    )
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if computed_hash != check_hash:
        return False
    auth_date = int(data.get("auth_date", "0"))
    if time.time() - auth_date > 3600:
        return False
    return True


async def get_current_user(request: Request) -> dict[str, Any] | None:
    """Extract current user from session cookie. Returns None for anonymous."""
    token = request.cookies.get("session")
    if not token:
        return None
    session = storage.get_session(token)
    if session is None:
        return None
    return storage.get_user(session["tg_id"])
