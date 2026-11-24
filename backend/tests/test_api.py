"""Comprehensive automated tests for Boongood AI Company Layer 2 Backend."""

from __future__ import annotations

import base64
import uuid
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.gemini_service import GeminiService
from app.main import create_app, get_bridge, get_gemini, get_settings, get_supabase


class FakeSupabase:
    """In-memory fake Supabase store mirroring backend/supabase_schema.sql."""

    def __init__(self) -> None:
        self.agents: dict[str, dict[str, Any]] = {
            "rachel": {
                "id": "rachel",
                "display_name": "Rachel Green",
                "role": "Thương hiệu & Thiết kế",
                "mode": "PASSIVE",
                "current_state": "IDLE",
                "persona_prompt": "Bạn là Rachel Green phụ trách thương hiệu.",
                "current_task_summary": "",
                "updated_at": "2026-11-24T00:00:00Z",
            },
            "ross": {
                "id": "ross",
                "display_name": "Ross Geller",
                "role": "Nghiên cứu & Pháp lý",
                "mode": "PASSIVE",
                "current_state": "IDLE",
                "persona_prompt": "Bạn là Ross Geller phụ trách nghiên cứu & pháp lý.",
                "current_task_summary": "",
                "updated_at": "2026-11-24T00:00:00Z",
            },
        }
        self.chat_messages: list[dict[str, Any]] = []
        self.tasks: dict[str, dict[str, Any]] = {}
        self.state_transitions: list[tuple[str, str]] = []

    async def list_agents(self) -> list[dict[str, Any]]:
        return sorted(self.agents.values(), key=lambda x: x["id"])

    async def get_agent(self, agent_id: str) -> dict[str, Any] | None:
        return self.agents.get(agent_id)

    async def update_agent(self, agent_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
        if agent_id not in self.agents:
            return None
        self.agents[agent_id].update(fields)
        if "current_state" in fields:
            self.state_transitions.append((agent_id, fields["current_state"]))
        return self.agents[agent_id]

    async def get_recent_chat_messages(
        self, agent_id: str, session_id: str, limit: int = 8
    ) -> list[dict[str, Any]]:
        filtered = [
            m
            for m in self.chat_messages
            if m["agent_id"] == agent_id and m["session_id"] == session_id
        ]
        return filtered[-min(limit, 8) :]

    async def get_chat_history(
        self, agent_id: str, session_id: str = "default", limit: int = 20
    ) -> list[dict[str, Any]]:
        filtered = [
            m
            for m in self.chat_messages
            if m["agent_id"] == agent_id and m["session_id"] == session_id
        ]
        return filtered[-limit:]

    async def get_chat_message(self, message_id: str) -> dict[str, Any] | None:
        for msg in self.chat_messages:
            if msg["id"] == message_id:
                return msg
        return None

    async def create_chat_message(self, payload: dict[str, Any]) -> dict[str, Any]:
        row = {"id": str(uuid.uuid4()), "created_at": "2026-11-24T00:00:00Z", **payload}
        self.chat_messages.append(row)
        return row

    async def update_chat_message(
        self, message_id: str, fields: dict[str, Any]
    ) -> dict[str, Any] | None:
        msg = await self.get_chat_message(message_id)
        if not msg:
            return None
        msg.update(fields)
        return msg

    async def create_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        task_id = str(uuid.uuid4())
        row = {
            "id": task_id,
            "reasoning_steps": 0,
            "tokens_used": 0,
            "created_at": "2026-11-24T00:00:00Z",
            "updated_at": "2026-11-24T00:00:00Z",
            **payload,
        }
        self.tasks[task_id] = row
        return row

    async def get_task(self, task_id: str) -> dict[str, Any] | None:
        return self.tasks.get(task_id)

    async def list_tasks(
        self,
        agent_id: str | None = None,
        status: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        rows = list(self.tasks.values())
        if agent_id:
            rows = [r for r in rows if r["agent_id"] == agent_id]
        if status:
            rows = [r for r in rows if r["status"] == status]
        return rows[:limit]

    async def update_task(self, task_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
        if task_id not in self.tasks:
            return None
        self.tasks[task_id].update(fields)
        return self.tasks[task_id]


class FakeBridge:
    """In-memory fake Workspace Bridge recording every Layer 1 call."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def create_doc(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append({"action": "create_doc", **kwargs})
        return {
            "ok": True,
            "task_id": kwargs.get("task_id") or "TASK-DOC-001",
            "file_id": "doc_file_123",
            "file_url": "https://docs.google.com/document/d/doc_file_123/edit",
        }

    async def append_sheet(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append({"action": "append_sheet", **kwargs})
        return {
            "ok": True,
            "sheet_name": kwargs["sheet_name"],
            "rows_added": len(kwargs["rows"]),
            "sheet_url": "https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=2",
        }

    async def save_file(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append({"action": "save_file", **kwargs})
        return {
            "ok": True,
            "task_id": kwargs.get("task_id") or "TASK-FILE-001",
            "file_id": "proto_file_456",
            "file_url": "https://drive.google.com/file/d/proto_file_456/view",
        }

    async def approve_file(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append({"action": "approve_file", **kwargs})
        return {
            "ok": True,
            "file_id": kwargs["file_id"],
            "file_url": f"https://docs.google.com/document/d/{kwargs['file_id']}/edit",
            "target_folder": kwargs["target_folder"],
            "status": "APPROVED",
            "tasks_log_updated": True,
        }


class FakeAsyncGenAIModels:
    """Fake google-genai client.aio.models capturing exact prompts, tools, and step counts."""

    def __init__(self, responses: list[Any]) -> None:
        self.responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    async def generate_content(self, *, model: str, contents: Any, config: Any) -> Any:
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self.responses:
            return self.responses.pop(0)
        return SimpleNamespace(
            text="Fallback reply",
            usage_metadata=SimpleNamespace(total_token_count=42),
            candidates=[],
            function_calls=[],
        )


def _make_gemini_service(fake_models: FakeAsyncGenAIModels) -> GeminiService:
    svc = GeminiService(
        api_key="test-key",
        model_passive="gemini-3.5-flash-lite",
        model_autonomous="gemini-3.8-flash",
    )
    svc._client = SimpleNamespace(aio=SimpleNamespace(models=fake_models))  # type: ignore[assignment]
    return svc


def _build_test_client(
    *,
    db: FakeSupabase,
    bridge: FakeBridge,
    gemini: GeminiService,
    backend_api_key: str = "",
) -> TestClient:
    app = create_app()
    test_settings = Settings(
        gemini_api_key="test-key",
        gemini_model_passive="gemini-3.5-flash-lite",
        gemini_model_autonomous="gemini-3.8-flash",
        supabase_url="https://fake.supabase.co",
        supabase_service_role_key="fake-service-role",
        bridge_url="https://script.google.com/macros/s/fake/exec",
        bridge_secret="fake-bridge-secret",
        backend_api_key=backend_api_key,
    )
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_supabase] = lambda: db
    app.dependency_overrides[get_bridge] = lambda: bridge
    app.dependency_overrides[get_gemini] = lambda: gemini
    return TestClient(app)


def test_health_and_api_key_guard() -> None:
    db, bridge = FakeSupabase(), FakeBridge()
    gemini = _make_gemini_service(FakeAsyncGenAIModels([]))
    client = _build_test_client(
        db=db, bridge=bridge, gemini=gemini, backend_api_key="top-secret-key"
    )

    # /health must remain open for Cloud Run probes (0 token)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["idle_token_usage"] == 0

    # /api/agents requires X-API-Key when configured
    assert client.get("/api/agents").status_code == 401
    ok = client.get("/api/agents", headers={"X-API-Key": "top-secret-key"})
    assert ok.status_code == 200
    assert len(ok.json()) == 2


def test_passive_chat_caps_history_at_8_and_sends_zero_tools_with_image_and_search() -> None:
    db, bridge = FakeSupabase(), FakeBridge()
    # Pre-seed 12 historical messages to verify only the last 8 are sent to Gemini
    for i in range(12):
        db.chat_messages.append(
            {
                "id": f"hist-{i}",
                "agent_id": "rachel",
                "session_id": "default",
                "role": "user" if i % 2 == 0 else "assistant",
                "content": f"old-msg-{i}",
                "has_image": False,
                "tokens_used": 10,
                "created_at": f"2026-11-24T00:00:{i:02d}Z",
            }
        )

    fake_models = FakeAsyncGenAIModels(
        [
            # Call 1: JSON + base64 image, use_search=False -> ZERO tools attached
            SimpleNamespace(
                text="Tông màu pastel rất sang! Chỉnh nhẹ logo lên 15% là hoàn hảo.",
                usage_metadata=SimpleNamespace(total_token_count=320),
                candidates=[],
                function_calls=[],
            ),
            # Call 2: multipart file upload + use_search=True -> GoogleSearch grounding only
            SimpleNamespace(
                text="Xu hướng hộp quà Tết 2026 chuộng giấy mỹ thuật tối giản.",
                usage_metadata=SimpleNamespace(total_token_count=410),
                candidates=[
                    SimpleNamespace(
                        grounding_metadata=SimpleNamespace(
                            grounding_chunks=[
                                SimpleNamespace(
                                    web=SimpleNamespace(
                                        title="Packaging Trends 2026",
                                        uri="https://example.com/packaging-2026",
                                    )
                                )
                            ]
                        )
                    )
                ],
                function_calls=[],
            ),
        ]
    )
    gemini = _make_gemini_service(fake_models)
    client = _build_test_client(db=db, bridge=bridge, gemini=gemini)

    # 1) JSON with data-URL base64 image and use_search=False
    tiny_png = base64.b64encode(b"\x89PNG\r\n\x1a\nfakeimage").decode("ascii")
    res1 = client.post(
        "/api/chat",
        json={
            "agent_id": "rachel",
            "message": "Góp ý bao bì này giúp mình nhé!",
            "image_base64": f"data:image/png;base64,{tiny_png}",
            "use_search": False,
        },
    )
    assert res1.status_code == 200
    body1 = res1.json()
    assert body1["has_image"] is True
    assert body1["tokens_used"] == 320
    assert body1["model_used"] == "gemini-3.5-flash-lite"
    assert db.agents["rachel"]["current_state"] == "IDLE"
    assert ("rachel", "WORKING") in db.state_transitions
    assert db.state_transitions[-1] == ("rachel", "IDLE")

    # Verify history cap (8 previous + 1 current = 9 contents) & zero tools
    call1 = fake_models.calls[0]
    assert call1["model"] == "gemini-3.5-flash-lite"
    assert len(call1["contents"]) == 9
    assert call1["contents"][0].parts[0].text == "old-msg-4"
    assert call1["config"].tools is None
    assert len(call1["contents"][-1].parts) == 2  # text + inline image

    # 2) Multipart image upload with use_search=True
    res2 = client.post(
        "/api/chat",
        data={"agent_id": "rachel", "message": "Tra xu hướng bao bì mới nhất?", "use_search": "true"},
        files={"image": ("box.jpg", b"\xff\xd8\xff\xe0fakejpg", "image/jpeg")},
    )
    assert res2.status_code == 200
    body2 = res2.json()
    assert body2["has_image"] is True
    assert body2["used_search"] is True
    assert body2["search_sources"] == [
        {"title": "Packaging Trends 2026", "url": "https://example.com/packaging-2026"}
    ]
    call2 = fake_models.calls[1]
    assert call2["config"].tools is not None
    assert call2["config"].tools[0].google_search is not None
    assert call2["config"].tools[0].function_declarations is None


def test_save_to_drive_uses_zero_ai_tokens_for_doc_and_sheet() -> None:
    db, bridge = FakeSupabase(), FakeBridge()
    fake_models = FakeAsyncGenAIModels([])
    gemini = _make_gemini_service(fake_models)
    client = _build_test_client(db=db, bridge=bridge, gemini=gemini)

    msg_id = str(uuid.uuid4())
    db.chat_messages.append(
        {
            "id": msg_id,
            "agent_id": "rachel",
            "session_id": "default",
            "role": "assistant",
            "content": "## Góp ý bao bì\n- Dùng tông kem ấm\n- Tăng kích thước logo",
            "has_image": False,
            "tokens_used": 180,
        }
    )

    # Save message as Google Doc
    doc_res = client.post(
        "/api/chat/save-to-drive",
        json={"save_type": "doc", "message_id": msg_id, "title": "Góp ý bao bì từ Rachel"},
    )
    assert doc_res.status_code == 200
    doc_data = doc_res.json()
    assert doc_data["tokens_used"] == 0
    assert doc_data["file_id"] == "doc_file_123"
    assert db.chat_messages[0]["drive_file_url"] == doc_data["file_url"]

    # Save structured row to Finance_Models sheet
    sheet_res = client.post(
        "/api/chat/save-to-drive",
        json={
            "save_type": "sheet",
            "sheet_name": "Finance_Models",
            "rows": [{"Item_Name": "Set Quà Tết", "Cost_COGS": 180000, "Selling_Price": 399000}],
        },
    )
    assert sheet_res.status_code == 200
    assert sheet_res.json()["rows_added"] == 1
    assert sheet_res.json()["tokens_used"] == 0

    # Confirm Gemini was NEVER invoked (0 AI tokens!)
    assert len(fake_models.calls) == 0
    assert len(bridge.calls) == 2


def test_autonomous_mode_guard_hard_3_step_cap_and_review_flows() -> None:
    db, bridge = FakeSupabase(), FakeBridge()

    # Build a looping mock Gemini that ALWAYS tries to call create_doc (testing hard cap = 3!)
    looping_tool_response = SimpleNamespace(
        text="",
        usage_metadata=SimpleNamespace(total_token_count=200),
        candidates=[SimpleNamespace(content=SimpleNamespace(role="model", parts=[]))],
        function_calls=[
            SimpleNamespace(
                name="create_doc",
                args={
                    "title": "Nghiên cứu thị trường bánh quy",
                    "content": "## Đối thủ\n- Brand A\n- Brand B",
                    "summary": "Báo cáo nháp 2 đối thủ chính.",
                },
            )
        ],
    )
    fake_models = FakeAsyncGenAIModels(
        [looping_tool_response, looping_tool_response, looping_tool_response, looping_tool_response]
    )
    gemini = _make_gemini_service(fake_models)
    client = _build_test_client(db=db, bridge=bridge, gemini=gemini)

    # 1) Must reject task while Ross is still in PASSIVE mode
    blocked = client.post(
        "/api/tasks",
        json={"agent_id": "ross", "goal": "Nghiên cứu thị trường bánh quy"},
    )
    assert blocked.status_code == 400
    assert len(fake_models.calls) == 0

    # 2) Toggle Ross to AUTONOMOUS
    mode_res = client.patch("/api/agents/ross/mode", json={"mode": "AUTONOMOUS"})
    assert mode_res.status_code == 200
    assert mode_res.json()["mode"] == "AUTONOMOUS"

    # 3) Run autonomous task -> MUST halt strictly at 3 steps & move to WAITING_APPROVAL
    task_res = client.post(
        "/api/tasks",
        json={"agent_id": "ross", "goal": "Nghiên cứu thị trường bánh quy"},
    )
    assert task_res.status_code == 200
    task_data = task_res.json()
    assert task_data["status"] == "WAITING_APPROVAL"
    assert task_data["reasoning_steps"] == 3
    assert task_data["tokens_used"] == 600
    assert task_data["drive_file_id"] == "doc_file_123"
    assert task_data["model_used"] == "gemini-3.8-flash"
    assert len(fake_models.calls) == 3  # Hard cap strictly enforced!
    assert db.agents["ross"]["current_state"] == "WAITING_APPROVAL"

    # 4) CEO Approves -> calls Bridge approve_file & returns Ross to IDLE
    approve_res = client.post(
        f"/api/tasks/{task_data['id']}/review",
        json={
            "decision": "approve",
            "target_folder": "01_Market_Research",
            "ceo_feedback": "Tốt lắm Ross, duyệt lưu!",
        },
    )
    assert approve_res.status_code == 200
    approve_data = approve_res.json()
    assert approve_data["task"]["status"] == "APPROVED"
    assert approve_data["agent_state"] == "IDLE"
    assert approve_data["tokens_used"] == 0
    assert db.agents["ross"]["current_state"] == "IDLE"
    assert bridge.calls[-1]["action"] == "approve_file"
    assert bridge.calls[-1]["target_folder"] == "01_Market_Research"

    # 5) CEO Rejects another task -> saves feedback, returns agent to IDLE, spends 0 AI tokens
    task2_id = str(uuid.uuid4())
    db.tasks[task2_id] = {
        "id": task2_id,
        "bridge_task_id": "TASK-ROSS-2",
        "agent_id": "ross",
        "goal": "Kiểm tra nhãn mác",
        "status": "WAITING_APPROVAL",
        "drive_file_id": "doc_file_999",
        "reasoning_steps": 1,
        "tokens_used": 150,
    }
    db.agents["ross"]["current_state"] = "WAITING_APPROVAL"

    gemini_calls_before_reject = len(fake_models.calls)
    reject_res = client.post(
        f"/api/tasks/{task2_id}/review",
        json={"decision": "reject", "ceo_feedback": "Cần bổ sung quy định thành phần dinh dưỡng."},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["task"]["status"] == "REVISION_REQUESTED"
    assert reject_res.json()["agent_state"] == "IDLE"
    assert reject_res.json()["tokens_used"] == 0
    assert len(fake_models.calls) == gemini_calls_before_reject


def test_openapi_docs_save_file_and_error_state_recovery() -> None:
    db, bridge = FakeSupabase(), FakeBridge()

    class FailingModels:
        async def generate_content(self, **kwargs: Any) -> Any:
            raise RuntimeError("Simulated Gemini outage")

    gemini = GeminiService(
        api_key="test-key",
        model_passive="gemini-3.5-flash-lite",
        model_autonomous="gemini-3.8-flash",
    )
    gemini._client = SimpleNamespace(aio=SimpleNamespace(models=FailingModels()))  # type: ignore[assignment]
    client = _build_test_client(db=db, bridge=bridge, gemini=gemini)

    # 1) Swagger / OpenAPI schema includes both multipart and JSON for /api/chat
    schema_res = client.get("/openapi.json")
    assert schema_res.status_code == 200
    chat_body = schema_res.json()["paths"]["/api/chat"]["post"]["requestBody"]["content"]
    assert "multipart/form-data" in chat_body
    assert "application/json" in chat_body
    assert client.get("/docs").status_code == 200

    # 2) save_to_drive with save_type='file' spends 0 AI tokens
    file_res = client.post(
        "/api/chat/save-to-drive",
        json={
            "save_type": "file",
            "agent_id": "rachel",
            "file_name": "brand_palette.md",
            "content": "# Bảng màu BoonGood\n- Kem ấm #F7EFE5",
        },
    )
    assert file_res.status_code == 200
    assert file_res.json()["tokens_used"] == 0
    assert file_res.json()["file_id"] == "proto_file_456"

    # 3) Passive chat failure resets agent state back to IDLE (never stuck on WORKING)
    fail_chat = client.post(
        "/api/chat",
        json={"agent_id": "rachel", "message": "Kiểm tra giúp mình"},
    )
    assert fail_chat.status_code == 502
    assert db.agents["rachel"]["current_state"] == "IDLE"

    # 4) Autonomous task failure marks task FAILED and returns agent to IDLE
    db.agents["ross"]["mode"] = "AUTONOMOUS"
    fail_task = client.post(
        "/api/tasks",
        json={"agent_id": "ross", "goal": "Phân tích đối thủ"},
    )
    assert fail_task.status_code == 502
    assert db.agents["ross"]["current_state"] == "IDLE"
    created_task = next(iter(db.tasks.values()))
    assert created_task["status"] == "FAILED"


def test_supabase_schema_contains_all_six_friends_and_required_tables() -> None:
    from pathlib import Path

    sql = Path(__file__).resolve().parents[1].joinpath("supabase_schema.sql").read_text(
        encoding="utf-8"
    )
    for table in ("public.agents", "public.chat_messages", "public.tasks"):
        assert f"CREATE TABLE IF NOT EXISTS {table}" in sql
    for slug in ("'rachel'", "'monica'", "'chandler'", "'ross'", "'joey'", "'phoebe'"):
        assert slug in sql
    assert "tokens_used" in sql
    assert "drive_file_url" in sql

