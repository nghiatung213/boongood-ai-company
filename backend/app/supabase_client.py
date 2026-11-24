"""Lightweight async Supabase PostgREST client built on httpx."""

from __future__ import annotations

from typing import Any

import httpx


class SupabaseError(RuntimeError):
    """Raised when Supabase REST API returns an unexpected response."""


class SupabaseClient:
    """Thin async wrapper over Supabase PostgREST (/rest/v1) for minimal Docker footprint."""

    def __init__(self, supabase_url: str, service_role_key: str, timeout: float = 20.0) -> None:
        self.base_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key.strip()
        self.timeout = timeout

    def _ensure_configured(self) -> None:
        if not self.base_url or not self.service_role_key:
            raise SupabaseError(
                "Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường."
            )

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    async def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json_body: dict[str, Any] | list[dict[str, Any]] | None = None,
        prefer: str | None = None,
    ) -> Any:
        self._ensure_configured()
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method,
                url,
                params=params,
                json=json_body,
                headers=self._headers(prefer=prefer),
            )

        if response.status_code >= 400:
            raise SupabaseError(
                f"Supabase {method} /{table} failed ({response.status_code}): {response.text[:300]}"
            )

        if not response.text.strip():
            return None
        return response.json()

    # ------------------------------------------------------------------
    # agents
    # ------------------------------------------------------------------
    async def list_agents(self) -> list[dict[str, Any]]:
        rows = await self._request("GET", "agents", params={"select": "*", "order": "id.asc"})
        return rows or []

    async def get_agent(self, agent_id: str) -> dict[str, Any] | None:
        rows = await self._request(
            "GET",
            "agents",
            params={"select": "*", "id": f"eq.{agent_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def update_agent(self, agent_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
        rows = await self._request(
            "PATCH",
            "agents",
            params={"id": f"eq.{agent_id}", "select": "*"},
            json_body=fields,
            prefer="return=representation",
        )
        return rows[0] if rows else None

    # ------------------------------------------------------------------
    # chat_messages
    # ------------------------------------------------------------------
    async def get_recent_chat_messages(
        self,
        agent_id: str,
        session_id: str,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 8))
        rows = await self._request(
            "GET",
            "chat_messages",
            params={
                "select": "id,role,content,has_image,created_at",
                "agent_id": f"eq.{agent_id}",
                "session_id": f"eq.{session_id}",
                "order": "created_at.desc",
                "limit": str(safe_limit),
            },
        )
        # Return in chronological order (oldest -> newest) for Gemini context
        return list(reversed(rows or []))

    async def get_chat_history(
        self,
        agent_id: str,
        session_id: str = "default",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._request(
            "GET",
            "chat_messages",
            params={
                "select": "*",
                "agent_id": f"eq.{agent_id}",
                "session_id": f"eq.{session_id}",
                "order": "created_at.desc",
                "limit": str(safe_limit),
            },
        )
        return list(reversed(rows or []))

    async def get_chat_message(self, message_id: str) -> dict[str, Any] | None:
        rows = await self._request(
            "GET",
            "chat_messages",
            params={"select": "*", "id": f"eq.{message_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def create_chat_message(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request(
            "POST",
            "chat_messages",
            json_body=payload,
            prefer="return=representation",
        )
        if not rows:
            raise SupabaseError("Failed to insert record into chat_messages.")
        return rows[0]

    async def update_chat_message(
        self, message_id: str, fields: dict[str, Any]
    ) -> dict[str, Any] | None:
        rows = await self._request(
            "PATCH",
            "chat_messages",
            params={"id": f"eq.{message_id}", "select": "*"},
            json_body=fields,
            prefer="return=representation",
        )
        return rows[0] if rows else None

    # ------------------------------------------------------------------
    # tasks
    # ------------------------------------------------------------------
    async def create_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request(
            "POST",
            "tasks",
            json_body=payload,
            prefer="return=representation",
        )
        if not rows:
            raise SupabaseError("Failed to insert record into tasks.")
        return rows[0]

    async def get_task(self, task_id: str) -> dict[str, Any] | None:
        rows = await self._request(
            "GET",
            "tasks",
            params={"select": "*", "id": f"eq.{task_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    async def list_tasks(
        self,
        agent_id: str | None = None,
        status: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {
            "select": "*",
            "order": "created_at.desc",
            "limit": str(max(1, min(limit, 100))),
        }
        if agent_id:
            params["agent_id"] = f"eq.{agent_id}"
        if status:
            params["status"] = f"eq.{status}"
        rows = await self._request("GET", "tasks", params=params)
        return rows or []

    async def update_task(self, task_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
        rows = await self._request(
            "PATCH",
            "tasks",
            params={"id": f"eq.{task_id}", "select": "*"},
            json_body=fields,
            prefer="return=representation",
        )
        return rows[0] if rows else None
