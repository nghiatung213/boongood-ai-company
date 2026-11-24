"""Async client for Layer 1 Workspace Bridge (Google Apps Script Web App)."""

from __future__ import annotations

from typing import Any

import httpx


class BridgeError(RuntimeError):
    """Raised when the Layer 1 Workspace Bridge rejects or fails a request."""


class WorkspaceBridgeClient:
    """Calls workspace-bridge/Code.gs Web App (/exec) without modifying Layer 1."""

    def __init__(self, bridge_url: str, bridge_secret: str, timeout: float = 45.0) -> None:
        self.bridge_url = bridge_url.strip()
        self.bridge_secret = bridge_secret.strip()
        self.timeout = timeout

    def _ensure_configured(self) -> None:
        if not self.bridge_url or not self.bridge_secret:
            raise BridgeError(
                "Thiếu cấu hình BRIDGE_URL hoặc BRIDGE_SECRET trong biến môi trường."
            )

    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._ensure_configured()
        body = {**payload, "api_secret": self.bridge_secret}
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.post(self.bridge_url, json=body)

        if response.status_code != 200:
            raise BridgeError(
                f"Workspace Bridge trả về HTTP {response.status_code}: {response.text[:250]}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise BridgeError(
                f"Workspace Bridge trả về nội dung không phải JSON: {response.text[:250]}"
            ) from exc

        if not isinstance(data, dict) or not data.get("ok"):
            error_msg = data.get("error", data) if isinstance(data, dict) else data
            raise BridgeError(f"Workspace Bridge báo lỗi: {error_msg}")

        return data

    async def create_doc(
        self,
        *,
        title: str,
        content: str,
        agent_name: str,
        goal: str | None = None,
        summary: str | None = None,
        task_id: str | None = None,
        status: str = "WAITING_APPROVAL",
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "action": "create_doc",
            "title": title,
            "content": content,
            "agent_name": agent_name,
            "goal": goal or title,
            "status": status,
            "summary": summary or "",
        }
        if task_id:
            payload["task_id"] = task_id
        return await self._post(payload)

    async def append_sheet(
        self,
        *,
        sheet_name: str,
        rows: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return await self._post(
            {
                "action": "append_sheet",
                "sheet_name": sheet_name,
                "rows": rows,
            }
        )

    async def save_file(
        self,
        *,
        file_name: str,
        content: str,
        agent_name: str,
        goal: str | None = None,
        summary: str | None = None,
        task_id: str | None = None,
        mime_type: str | None = None,
        status: str = "WAITING_APPROVAL",
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "action": "save_file",
            "file_name": file_name,
            "content": content,
            "agent_name": agent_name,
            "goal": goal or f"Save file: {file_name}",
            "status": status,
            "summary": summary or "",
        }
        if task_id:
            payload["task_id"] = task_id
        if mime_type:
            payload["mime_type"] = mime_type
        return await self._post(payload)

    async def approve_file(
        self,
        *,
        file_id: str,
        target_folder: str,
        task_id: str | None = None,
        ceo_feedback: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "action": "approve_file",
            "file_id": file_id,
            "target_folder": target_folder,
        }
        if task_id:
            payload["task_id"] = task_id
        if ceo_feedback is not None:
            payload["ceo_feedback"] = ceo_feedback
        return await self._post(payload)
