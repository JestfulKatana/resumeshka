"""In-memory task storage for MVP. Replace with Redis/PostgreSQL for production."""

import uuid
import time
from typing import Any


class TaskStorage:
    def __init__(self, ttl_seconds: int = 86400):
        self._tasks: dict[str, dict[str, Any]] = {}
        self._hash_index: dict[str, str] = {}  # content_hash → task_id
        self._users: dict[int, dict[str, Any]] = {}  # tg_id → user
        self._sessions: dict[str, dict[str, Any]] = {}  # token → session
        self._ttl = ttl_seconds

    def create_task(
        self,
        file_name: str,
        raw_text: str,
        content_hash: str | None = None,
        user_id: int | None = None,
    ) -> str:
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = {
            "id": task_id,
            "created_at": time.time(),
            "file_name": file_name,
            "raw_text": raw_text,
            "content_hash": content_hash,
            "user_id": user_id,
            "parse_result": None,
            "scoring": None,
            "annotations": None,
            "roles": None,
            "selected_role": None,
            "rewrite": None,
            "rechecks": [],
        }
        if content_hash:
            self._hash_index[content_hash] = task_id
        return task_id

    def find_by_hash(self, content_hash: str) -> dict[str, Any] | None:
        task_id = self._hash_index.get(content_hash)
        if task_id is None:
            return None
        task = self.get_task(task_id)
        if task is None:
            del self._hash_index[content_hash]
            return None
        return task

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        task = self._tasks.get(task_id)
        if task is None:
            return None
        if time.time() - task["created_at"] > self._ttl:
            del self._tasks[task_id]
            return None
        return task

    def update_task(self, task_id: str, **kwargs: Any) -> None:
        task = self._tasks.get(task_id)
        if task is not None:
            task.update(kwargs)

    # --- User / Session ---

    def upsert_user(
        self,
        tg_id: int,
        username: str,
        first_name: str,
        photo_url: str | None = None,
    ) -> dict[str, Any]:
        user = {
            "tg_id": tg_id,
            "username": username,
            "first_name": first_name,
            "photo_url": photo_url,
            "created_at": self._users.get(tg_id, {}).get("created_at", time.time()),
            "updated_at": time.time(),
        }
        self._users[tg_id] = user
        return user

    def get_user(self, tg_id: int) -> dict[str, Any] | None:
        return self._users.get(tg_id)

    def create_session(self, tg_id: int) -> str:
        token = str(uuid.uuid4())
        self._sessions[token] = {
            "token": token,
            "tg_id": tg_id,
            "created_at": time.time(),
        }
        return token

    def get_session(self, token: str) -> dict[str, Any] | None:
        session = self._sessions.get(token)
        if session is None:
            return None
        if time.time() - session["created_at"] > self._ttl:
            del self._sessions[token]
            return None
        return session

    def get_user_tasks(self, tg_id: int, limit: int = 20) -> list[dict[str, Any]]:
        user_tasks = [
            t
            for t in self._tasks.values()
            if t.get("user_id") == tg_id
            and time.time() - t["created_at"] <= self._ttl
        ]
        user_tasks.sort(key=lambda t: t["created_at"], reverse=True)
        return user_tasks[:limit]


storage = TaskStorage()
