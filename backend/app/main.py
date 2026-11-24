"""Boongood AI Company - Layer 2 FastAPI Backend (Chatbot-First)."""

from __future__ import annotations

import base64
import hmac
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.bridge_client import BridgeError, WorkspaceBridgeClient
from app.config import Settings, get_settings
from app.gemini_service import GeminiError, GeminiService
from app.schemas import (
    AgentModeUpdateRequest,
    AgentOut,
    ChatJsonRequest,
    ChatResponse,
    CreateTaskRequest,
    SaveToDriveRequest,
    SaveToDriveResponse,
    SearchSource,
    TaskOut,
    TaskReviewRequest,
    TaskReviewResponse,
)
from app.supabase_client import SupabaseClient, SupabaseError

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DATA_URL_RE = re.compile(r"^data:(?P<mime>image/[a-zA-Z0-9.+-]+);base64,(?P<data>.+)$", re.DOTALL)


def get_supabase(settings: Settings = Depends(get_settings)) -> SupabaseClient:
    return SupabaseClient(
        supabase_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
    )


def get_bridge(settings: Settings = Depends(get_settings)) -> WorkspaceBridgeClient:
    return WorkspaceBridgeClient(
        bridge_url=settings.bridge_url,
        bridge_secret=settings.bridge_secret,
    )


def get_gemini(settings: Settings = Depends(get_settings)) -> GeminiService:
    return GeminiService(
        api_key=settings.gemini_api_key,
        model_passive=settings.gemini_model_passive,
        model_autonomous=settings.gemini_model_autonomous,
    )


def verify_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.backend_api_key.strip()
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key.strip(), expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: thiếu hoặc sai header X-API-Key.",
        )


def _decode_base64_image(
    raw_base64: str,
    provided_mime: str | None,
    max_bytes: int,
) -> tuple[bytes, str]:
    cleaned = raw_base64.strip()
    mime = (provided_mime or "").strip().lower()

    match = DATA_URL_RE.match(cleaned)
    if match:
        if not mime:
            mime = match.group("mime").lower()
        cleaned = match.group("data").strip()

    if not mime:
        mime = "image/jpeg"
    if mime not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng ảnh '{mime}' không được hỗ trợ. Dùng: JPEG, PNG, WEBP hoặc GIF.",
        )

    try:
        image_bytes = base64.b64decode(cleaned, validate=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuỗi image_base64 không hợp lệ.",
        ) from exc

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh đính kèm đang rỗng.",
        )
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ảnh vượt quá giới hạn tối đa {max_bytes // (1024 * 1024)} MB.",
        )

    return image_bytes, mime


def _parse_bool_flag(raw: Any) -> bool:
    if isinstance(raw, bool):
        return raw
    return str(raw or "").strip().lower() in {"1", "true", "yes", "on"}


async def _parse_chat_payload(
    request: Request,
    max_image_bytes: int,
) -> tuple[str, str, str, bool, bytes | None, str | None]:
    """Supports both application/json (with optional image_base64) and multipart/form-data."""
    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        form = await request.form()
        agent_id = str(form.get("agent_id") or "").strip().lower()
        message = str(form.get("message") or "").strip()
        session_id = str(form.get("session_id") or "default").strip() or "default"
        use_search = _parse_bool_flag(form.get("use_search"))

        if not agent_id or not message:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu trường bắt buộc 'agent_id' hoặc 'message'.",
            )

        image_bytes: bytes | None = None
        image_mime: str | None = None
        upload = form.get("image")
        if upload is not None and hasattr(upload, "read"):
            raw = await upload.read()
            if raw:
                if len(raw) > max_image_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Ảnh vượt quá giới hạn tối đa {max_image_bytes // (1024 * 1024)} MB.",
                    )
                image_mime = (getattr(upload, "content_type", None) or "image/jpeg").lower()
                if image_mime not in ALLOWED_IMAGE_MIMES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Định dạng ảnh '{image_mime}' không được hỗ trợ. Dùng: JPEG, PNG, WEBP hoặc GIF.",
                    )
                image_bytes = raw

        return agent_id, message, session_id, use_search, image_bytes, image_mime

    # Default: JSON body
    try:
        raw_json = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung request không phải JSON hoặc multipart/form-data hợp lệ.",
        ) from exc

    try:
        parsed = ChatJsonRequest.model_validate(raw_json)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

    image_bytes = None
    image_mime = None
    if parsed.image_base64:
        image_bytes, image_mime = _decode_base64_image(
            parsed.image_base64,
            parsed.image_mime_type,
            max_image_bytes,
        )

    return (
        parsed.agent_id.strip().lower(),
        parsed.message.strip(),
        parsed.session_id.strip() or "default",
        parsed.use_search,
        image_bytes,
        image_mime,
    )


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Boongood AI Company — Layer 2 Backend",
        description=(
            "Backend gọn nhẹ theo hướng Chatbot-First với 6 nhân vật Friends "
            "(Rachel, Monica, Chandler, Ross, Joey, Phoebe), tối ưu tối đa token "
            "và kết nối trực tiếp Workspace Bridge (Google Drive & Sheets)."
        ),
        version="2.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Healthcheck (0 token, không yêu cầu API key)
    # ------------------------------------------------------------------
    @app.get("/health", tags=["System"])
    async def healthcheck() -> dict[str, Any]:
        return {
            "ok": True,
            "service": "boongood-backend",
            "mode": "chatbot-first",
            "idle_token_usage": 0,
        }

    # ------------------------------------------------------------------
    # Agents: List & Mode Switch
    # ------------------------------------------------------------------
    @app.get(
        "/api/agents",
        response_model=list[AgentOut],
        tags=["Agents"],
        dependencies=[Depends(verify_api_key)],
    )
    async def list_agents(db: SupabaseClient = Depends(get_supabase)) -> list[dict[str, Any]]:
        try:
            return await db.list_agents()
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.patch(
        "/api/agents/{agent_id}/mode",
        response_model=AgentOut,
        tags=["Agents"],
        dependencies=[Depends(verify_api_key)],
    )
    async def update_agent_mode(
        agent_id: str,
        payload: AgentModeUpdateRequest,
        db: SupabaseClient = Depends(get_supabase),
    ) -> dict[str, Any]:
        slug = agent_id.strip().lower()
        try:
            updated = await db.update_agent(slug, {"mode": payload.mode})
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhân vật '{slug}'.",
            )
        return updated

    # ------------------------------------------------------------------
    # Chat (PASSIVE — Priority #1) & History
    # ------------------------------------------------------------------
    @app.get(
        "/api/chat/history",
        tags=["Chat (PASSIVE)"],
        dependencies=[Depends(verify_api_key)],
    )
    async def get_chat_history(
        agent_id: str = Query(..., description="ID nhân vật (rachel, monica, chandler, ross, joey, phoebe)"),
        session_id: str = Query(default="default"),
        limit: int = Query(default=20, ge=1, le=100),
        db: SupabaseClient = Depends(get_supabase),
    ) -> dict[str, Any]:
        slug = agent_id.strip().lower()
        try:
            messages = await db.get_chat_history(slug, session_id=session_id, limit=limit)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        total_tokens = sum(int(m.get("tokens_used") or 0) for m in messages)
        return {
            "agent_id": slug,
            "session_id": session_id,
            "count": len(messages),
            "total_tokens_used": total_tokens,
            "messages": messages,
        }

    @app.post(
        "/api/chat",
        response_model=ChatResponse,
        tags=["Chat (PASSIVE)"],
        dependencies=[Depends(verify_api_key)],
        openapi_extra={
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "type": "object",
                            "required": ["agent_id", "message"],
                            "properties": {
                                "agent_id": {
                                    "type": "string",
                                    "default": "rachel",
                                    "description": "rachel | monica | chandler | ross | joey | phoebe",
                                },
                                "message": {
                                    "type": "string",
                                    "description": "Câu hỏi hoặc yêu cầu góp ý sản phẩm/thiết kế",
                                },
                                "session_id": {"type": "string", "default": "default"},
                                "use_search": {
                                    "type": "boolean",
                                    "default": False,
                                    "description": "Bật Google Search khi cần tra cứu thông tin thực tế",
                                },
                                "image": {
                                    "type": "string",
                                    "format": "binary",
                                    "description": "Ảnh sản phẩm/thiết kế tùy chọn (JPEG/PNG/WEBP)",
                                },
                            },
                        }
                    },
                    "application/json": {
                        "schema": ChatJsonRequest.model_json_schema(),
                    },
                },
            }
        },
    )
    async def chat_with_agent(
        request: Request,
        settings: Settings = Depends(get_settings),
        db: SupabaseClient = Depends(get_supabase),
        gemini: GeminiService = Depends(get_gemini),
    ) -> ChatResponse:
        agent_id, message, session_id, use_search, image_bytes, image_mime = (
            await _parse_chat_payload(request, settings.max_image_bytes)
        )

        try:
            agent = await db.get_agent(agent_id)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhân vật '{agent_id}'. Chọn 1 trong 6: rachel, monica, chandler, ross, joey, phoebe.",
            )

        # Load at most 8 most recent messages BEFORE saving current user message
        try:
            recent_history = await db.get_recent_chat_messages(
                agent_id,
                session_id,
                limit=settings.max_chat_history,
            )
            await db.update_agent(
                agent_id,
                {
                    "current_state": "WORKING",
                    "current_task_summary": message[:120],
                },
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        try:
            result = await gemini.chat_passive(
                persona_prompt=agent["persona_prompt"],
                history=recent_history,
                user_message=message,
                image_bytes=image_bytes,
                image_mime_type=image_mime,
                use_search=use_search,
            )
        except GeminiError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Lỗi gọi Gemini API: {exc}",
            ) from exc
        finally:
            # Always return agent to IDLE so it never gets stuck in WORKING
            try:
                await db.update_agent(
                    agent_id,
                    {"current_state": "IDLE", "current_task_summary": ""},
                )
            except Exception:
                pass

        try:
            user_row = await db.create_chat_message(
                {
                    "agent_id": agent_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": message,
                    "has_image": image_bytes is not None,
                    "used_search": use_search,
                    "tokens_used": 0,
                }
            )
            assistant_row = await db.create_chat_message(
                {
                    "agent_id": agent_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": result.reply,
                    "has_image": False,
                    "used_search": use_search,
                    "search_sources": result.search_sources,
                    "tokens_used": result.tokens_used,
                    "model_used": result.model_used,
                }
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return ChatResponse(
            agent_id=agent_id,
            agent_name=agent["display_name"],
            session_id=session_id,
            user_message_id=str(user_row["id"]),
            assistant_message_id=str(assistant_row["id"]),
            reply=result.reply,
            has_image=image_bytes is not None,
            used_search=use_search,
            search_sources=[SearchSource(**s) for s in result.search_sources],
            tokens_used=result.tokens_used,
            model_used=result.model_used,
        )

    # ------------------------------------------------------------------
    # Manual Save-to-Drive Button (0 AI tokens!)
    # ------------------------------------------------------------------
    @app.post(
        "/api/chat/save-to-drive",
        response_model=SaveToDriveResponse,
        tags=["Chat (PASSIVE)"],
        dependencies=[Depends(verify_api_key)],
    )
    async def save_chat_to_drive(
        payload: SaveToDriveRequest,
        db: SupabaseClient = Depends(get_supabase),
        bridge: WorkspaceBridgeClient = Depends(get_bridge),
    ) -> SaveToDriveResponse:
        """Lưu trực tiếp nội dung góp ý hay vào Google Drive/Sheets — dùng 0 token AI."""
        source_message: dict[str, Any] | None = None
        if payload.message_id:
            try:
                source_message = await db.get_chat_message(payload.message_id)
            except SupabaseError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            if not source_message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy tin nhắn '{payload.message_id}'.",
                )

        agent_id = (
            payload.agent_id
            or (source_message.get("agent_id") if source_message else None)
            or ""
        ).strip().lower()

        agent_name = "Boongood_Team"
        if agent_id:
            try:
                agent = await db.get_agent(agent_id)
                if agent:
                    agent_name = agent["display_name"]
            except SupabaseError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc

        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

        try:
            if payload.save_type == "sheet":
                if not payload.sheet_name or not payload.rows:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Khi save_type='sheet', bắt buộc cung cấp 'sheet_name' và 'rows'.",
                    )
                res = await bridge.append_sheet(
                    sheet_name=payload.sheet_name,
                    rows=payload.rows,
                )
                sheet_url = res.get("sheet_url")
                if source_message and sheet_url:
                    await db.update_chat_message(
                        str(source_message["id"]),
                        {"drive_file_url": sheet_url},
                    )
                return SaveToDriveResponse(
                    save_type="sheet",
                    tokens_used=0,
                    message_id=payload.message_id,
                    sheet_name=res.get("sheet_name"),
                    sheet_url=sheet_url,
                    rows_added=res.get("rows_added"),
                )

            content = (
                payload.content
                if payload.content is not None and payload.content.strip()
                else (source_message.get("content") if source_message else "")
            )
            if not content or not str(content).strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Cần cung cấp 'message_id' hoặc 'content' để lưu sang Google Drive.",
                )

            if payload.save_type == "file":
                file_name = (
                    payload.file_name
                    or f"boongood_{agent_id or 'note'}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
                )
                res = await bridge.save_file(
                    file_name=file_name,
                    content=str(content),
                    agent_name=agent_name,
                    goal=payload.title or f"Lưu góp ý từ {agent_name}",
                    summary=payload.summary or "Lưu thủ công từ khung chat (0 AI token).",
                )
            else:
                title = payload.title or f"[{agent_name}] Tư vấn BoonGood ({stamp})"
                res = await bridge.create_doc(
                    title=title,
                    content=str(content),
                    agent_name=agent_name,
                    goal=title,
                    summary=payload.summary or "Lưu thủ công từ khung chat (0 AI token).",
                )
        except HTTPException:
            raise
        except BridgeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        file_id = res.get("file_id")
        file_url = res.get("file_url")

        if source_message and (file_id or file_url):
            try:
                await db.update_chat_message(
                    str(source_message["id"]),
                    {"drive_file_id": file_id, "drive_file_url": file_url},
                )
            except SupabaseError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc

        return SaveToDriveResponse(
            save_type=payload.save_type,
            tokens_used=0,
            message_id=payload.message_id,
            task_id=res.get("task_id"),
            file_id=file_id,
            file_url=file_url,
        )

    # ------------------------------------------------------------------
    # Tasks (AUTONOMOUS — Opt-in, Hard Cap <= 3 Steps) & CEO Review
    # ------------------------------------------------------------------
    @app.get(
        "/api/tasks",
        response_model=list[TaskOut],
        tags=["Tasks (AUTONOMOUS)"],
        dependencies=[Depends(verify_api_key)],
    )
    async def list_tasks(
        agent_id: str | None = Query(default=None),
        task_status: str | None = Query(default=None, alias="status"),
        limit: int = Query(default=20, ge=1, le=100),
        db: SupabaseClient = Depends(get_supabase),
    ) -> list[dict[str, Any]]:
        try:
            return await db.list_tasks(
                agent_id=agent_id.strip().lower() if agent_id else None,
                status=task_status,
                limit=limit,
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post(
        "/api/tasks",
        response_model=TaskOut,
        tags=["Tasks (AUTONOMOUS)"],
        dependencies=[Depends(verify_api_key)],
    )
    async def create_autonomous_task(
        payload: CreateTaskRequest,
        settings: Settings = Depends(get_settings),
        db: SupabaseClient = Depends(get_supabase),
        bridge: WorkspaceBridgeClient = Depends(get_bridge),
        gemini: GeminiService = Depends(get_gemini),
    ) -> dict[str, Any]:
        agent_id = payload.agent_id.strip().lower()
        try:
            agent = await db.get_agent(agent_id)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhân vật '{agent_id}'.",
            )

        if agent.get("mode") != "AUTONOMOUS":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Nhân vật '{agent['display_name']}' đang ở chế độ PASSIVE (Chatbot). "
                    f"Hãy bật chế độ chủ động qua PATCH /api/agents/{agent_id}/mode trước khi giao task tự chủ."
                ),
            )

        bridge_task_id = f"TASK-{agent_id.upper()}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        try:
            task_row = await db.create_task(
                {
                    "bridge_task_id": bridge_task_id,
                    "agent_id": agent_id,
                    "goal": payload.goal.strip(),
                    "status": "WORKING",
                    "model_used": settings.gemini_model_autonomous,
                }
            )
            await db.update_agent(
                agent_id,
                {
                    "current_state": "WORKING",
                    "current_task_summary": payload.goal.strip()[:120],
                },
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        task_uuid = str(task_row["id"])

        try:
            run_result = await gemini.run_autonomous_task(
                agent_name=agent["display_name"],
                persona_prompt=agent["persona_prompt"],
                goal=payload.goal.strip(),
                context=payload.context,
                bridge_task_id=bridge_task_id,
                bridge_client=bridge,
                max_steps=settings.max_autonomous_steps,
            )
        except Exception as exc:
            try:
                await db.update_task(
                    task_uuid,
                    {"status": "FAILED", "result_summary": f"Lỗi thực thi: {exc}"},
                )
                await db.update_agent(
                    agent_id,
                    {"current_state": "IDLE", "current_task_summary": ""},
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=502,
                detail=f"Agent chủ động gặp lỗi khi thực thi: {exc}",
            ) from exc

        try:
            updated_task = await db.update_task(
                task_uuid,
                {
                    "status": "WAITING_APPROVAL",
                    "result_summary": run_result.summary,
                    "drive_file_id": run_result.drive_file_id,
                    "drive_file_url": run_result.drive_file_url,
                    "reasoning_steps": run_result.reasoning_steps,
                    "tokens_used": run_result.tokens_used,
                    "model_used": run_result.model_used,
                },
            )
            await db.update_agent(
                agent_id,
                {
                    "current_state": "WAITING_APPROVAL",
                    "current_task_summary": f"Chờ duyệt: {payload.goal.strip()[:100]}",
                },
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return updated_task or task_row

    @app.post(
        "/api/tasks/{task_id}/review",
        response_model=TaskReviewResponse,
        tags=["Tasks (AUTONOMOUS)"],
        dependencies=[Depends(verify_api_key)],
    )
    async def review_task(
        task_id: str,
        payload: TaskReviewRequest,
        db: SupabaseClient = Depends(get_supabase),
        bridge: WorkspaceBridgeClient = Depends(get_bridge),
    ) -> TaskReviewResponse:
        try:
            task = await db.get_task(task_id)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy task '{task_id}'.",
            )

        agent_id = task["agent_id"]
        bridge_result: dict[str, Any] | None = None

        if payload.decision == "approve":
            drive_file_id = task.get("drive_file_id")
            if drive_file_id:
                if not payload.target_folder:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            "Task có file nháp trên Drive: vui lòng chọn 'target_folder' "
                            "(01_Market_Research, 02_Prototypes_Drafts hoặc 03_Data_Calculations)."
                        ),
                    )
                try:
                    bridge_result = await bridge.approve_file(
                        file_id=str(drive_file_id),
                        target_folder=payload.target_folder,
                        task_id=task.get("bridge_task_id"),
                        ceo_feedback=payload.ceo_feedback,
                    )
                except BridgeError as exc:
                    raise HTTPException(status_code=502, detail=str(exc)) from exc

            new_status = "APPROVED"
            update_fields: dict[str, Any] = {
                "status": new_status,
                "target_folder": payload.target_folder,
                "ceo_feedback": payload.ceo_feedback or "",
            }
            if bridge_result and bridge_result.get("file_url"):
                update_fields["drive_file_url"] = bridge_result["file_url"]
        else:
            # Reject -> save feedback, return agent to IDLE, spend 0 AI tokens
            new_status = "REVISION_REQUESTED"
            update_fields = {
                "status": new_status,
                "ceo_feedback": payload.ceo_feedback or "",
            }

        try:
            updated_task = await db.update_task(task_id, update_fields)
            await db.update_agent(
                agent_id,
                {"current_state": "IDLE", "current_task_summary": ""},
            )
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return TaskReviewResponse(
            task=TaskOut.model_validate(updated_task or {**task, **update_fields}),
            agent_state="IDLE",
            bridge_result=bridge_result,
            tokens_used=0,
        )

    return app


app = create_app()
