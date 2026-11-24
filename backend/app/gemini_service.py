"""Gemini API service supporting ultra-light PASSIVE chat and capped AUTONOMOUS tasks."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from google import genai
from google.genai import types

from app.bridge_client import WorkspaceBridgeClient


class GeminiError(RuntimeError):
    """Raised when Gemini API configuration or generation fails."""


@dataclass
class PassiveChatResult:
    reply: str
    tokens_used: int
    model_used: str
    search_sources: list[dict[str, str]] = field(default_factory=list)


@dataclass
class AutonomousTaskResult:
    summary: str
    drive_file_id: str | None
    drive_file_url: str | None
    reasoning_steps: int
    tokens_used: int
    model_used: str
    tool_results: list[dict[str, Any]] = field(default_factory=list)


def _extract_total_tokens(response: Any) -> int:
    usage = getattr(response, "usage_metadata", None)
    if not usage:
        return 0
    total = getattr(usage, "total_token_count", None)
    if isinstance(total, int) and total >= 0:
        return total
    prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
    candidate_tokens = getattr(usage, "candidates_token_count", 0) or 0
    return int(prompt_tokens) + int(candidate_tokens)


def _extract_grounding_sources(response: Any) -> list[dict[str, str]]:
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return []
    metadata = getattr(candidates[0], "grounding_metadata", None)
    if not metadata:
        return []
    chunks = getattr(metadata, "grounding_chunks", None) or []
    seen_urls: set[str] = set()
    sources: list[dict[str, str]] = []
    for chunk in chunks:
        web = getattr(chunk, "web", None)
        if not web:
            continue
        url = (getattr(web, "uri", None) or "").strip()
        title = (getattr(web, "title", None) or url).strip()
        if url and url not in seen_urls:
            seen_urls.add(url)
            sources.append({"title": title, "url": url})
    return sources


def _build_autonomous_tools() -> list[types.Tool]:
    """Minimal Workspace Bridge tool schema — loaded ONLY in AUTONOMOUS mode."""
    return [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="create_doc",
                    description=(
                        "Tạo báo cáo/tài liệu Google Docs định dạng sạch trong thư mục "
                        "00_Inbox_Drafts và ghi vào Tasks_Log để chờ CEO duyệt."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "title": types.Schema(
                                type=types.Type.STRING,
                                description="Tiêu đề ngắn gọn, rõ ràng cho Google Docs.",
                            ),
                            "content": types.Schema(
                                type=types.Type.STRING,
                                description="Nội dung tài liệu dùng Markdown (## tiêu đề mục, - gạch đầu dòng).",
                            ),
                            "summary": types.Schema(
                                type=types.Type.STRING,
                                description="Tóm tắt 1-2 câu về sản phẩm nháp.",
                            ),
                        },
                        required=["title", "content", "summary"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="save_file",
                    description=(
                        "Lưu file prototype dạng text, HTML hoặc Markdown vào 00_Inbox_Drafts "
                        "và ghi log vào Tasks_Log để chờ CEO duyệt."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "file_name": types.Schema(
                                type=types.Type.STRING,
                                description="Tên file kèm đuôi (.html, .md, .txt).",
                            ),
                            "content": types.Schema(
                                type=types.Type.STRING,
                                description="Toàn bộ nội dung file.",
                            ),
                            "summary": types.Schema(
                                type=types.Type.STRING,
                                description="Tóm tắt ngắn về bản mẫu.",
                            ),
                        },
                        required=["file_name", "content", "summary"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="append_sheet",
                    description=(
                        "Ghi 1 hoặc nhiều dòng dữ liệu vào Google Sheets Boongood_Master_Ledger "
                        "(chỉ hỗ trợ tab Market_Data hoặc Finance_Models)."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "sheet_name": types.Schema(
                                type=types.Type.STRING,
                                description="Chọn 'Market_Data' hoặc 'Finance_Models'.",
                            ),
                            "rows_json": types.Schema(
                                type=types.Type.STRING,
                                description=(
                                    "Chuỗi JSON dạng mảng object. "
                                    "Market_Data: [{Competitor_Name, Product, Price, USP, Source_URL, Notes}]. "
                                    "Finance_Models: [{Item_Name, Cost_COGS, Selling_Price, Margin_Percent, Notes}]."
                                ),
                            ),
                        },
                        required=["sheet_name", "rows_json"],
                    ),
                ),
            ]
        )
    ]


class GeminiService:
    """Wraps google-genai SDK with strict separation between PASSIVE and AUTONOMOUS flows."""

    def __init__(
        self,
        api_key: str,
        model_passive: str,
        model_autonomous: str,
    ) -> None:
        self.api_key = api_key.strip()
        self.model_passive = model_passive.strip()
        self.model_autonomous = model_autonomous.strip()
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.api_key:
            raise GeminiError("Thiếu cấu hình GEMINI_API_KEY trong biến môi trường.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def chat_passive(
        self,
        *,
        persona_prompt: str,
        history: list[dict[str, Any]],
        user_message: str,
        image_bytes: bytes | None = None,
        image_mime_type: str | None = None,
        use_search: bool = False,
    ) -> PassiveChatResult:
        """
        PASSIVE Chatbot mode:
        - Uses GEMINI_MODEL_PASSIVE
        - Receives <= 8 recent text-only turns
        - Zero function-calling tool schema attached
        - Optional Google Search grounding only when use_search=True
        """
        client = self._get_client()

        contents: list[types.Content] = []
        for msg in history[-8:]:
            text = str(msg.get("content") or "").strip()
            if not text:
                continue
            gemini_role = "model" if msg.get("role") == "assistant" else "user"
            contents.append(
                types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)])
            )

        current_parts: list[types.Part] = [types.Part.from_text(text=user_message)]
        if image_bytes:
            current_parts.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=image_mime_type or "image/jpeg",
                )
            )
        contents.append(types.Content(role="user", parts=current_parts))

        tools = [types.Tool(google_search=types.GoogleSearch())] if use_search else None
        config = types.GenerateContentConfig(
            system_instruction=persona_prompt,
            tools=tools,
        )

        response = await client.aio.models.generate_content(
            model=self.model_passive,
            contents=contents,
            config=config,
        )

        reply = (getattr(response, "text", None) or "").strip()
        if not reply:
            reply = "(Nhân vật chưa trả về nội dung văn bản, bạn hãy thử hỏi cụ thể hơn nhé!)"

        return PassiveChatResult(
            reply=reply,
            tokens_used=_extract_total_tokens(response),
            model_used=self.model_passive,
            search_sources=_extract_grounding_sources(response) if use_search else [],
        )

    async def run_autonomous_task(
        self,
        *,
        agent_name: str,
        persona_prompt: str,
        goal: str,
        context: str | None,
        bridge_task_id: str,
        bridge_client: WorkspaceBridgeClient,
        max_steps: int = 3,
    ) -> AutonomousTaskResult:
        """
        AUTONOMOUS Agent mode (opt-in):
        - Hard-capped at <= 3 reasoning steps
        - Uses GEMINI_MODEL_AUTONOMOUS with minimal Workspace Bridge tools
        - Produces draft into 00_Inbox_Drafts / Master Ledger then halts for CEO review
        """
        client = self._get_client()
        hard_limit = max(1, min(max_steps, 3))

        autonomous_instruction = (
            f"{persona_prompt}\n\n"
            "CHẾ ĐỘ CHỦ ĐỘNG (AUTONOMOUS): Bạn có tối đa 3 bước suy luận. "
            "Hãy tạo sản phẩm nháp thực tế bằng công cụ `create_doc`, `save_file` hoặc `append_sheet` "
            "(mọi tài liệu nháp sẽ vào thư mục 00_Inbox_Drafts để chờ CEO duyệt), "
            "sau đó dừng lại và tóm tắt ngắn gọn kết quả + điểm cần CEO quyết định."
        )

        prompt_text = f"Mục tiêu nhiệm vụ: {goal}"
        if context and context.strip():
            prompt_text += f"\nThông tin bổ sung: {context.strip()}"

        contents: list[types.Content] = [
            types.Content(role="user", parts=[types.Part.from_text(text=prompt_text)])
        ]

        config = types.GenerateContentConfig(
            system_instruction=autonomous_instruction,
            tools=_build_autonomous_tools(),
        )

        total_tokens = 0
        steps_used = 0
        drive_file_id: str | None = None
        drive_file_url: str | None = None
        tool_results: list[dict[str, Any]] = []
        final_summary = ""

        for step in range(1, hard_limit + 1):
            steps_used = step
            response = await client.aio.models.generate_content(
                model=self.model_autonomous,
                contents=contents,
                config=config,
            )
            total_tokens += _extract_total_tokens(response)

            function_calls = getattr(response, "function_calls", None) or []
            if not function_calls:
                final_summary = (getattr(response, "text", None) or "").strip()
                break

            candidates = getattr(response, "candidates", None) or []
            if candidates and getattr(candidates[0], "content", None):
                contents.append(candidates[0].content)

            response_parts: list[types.Part] = []
            for call in function_calls:
                fn_name = str(getattr(call, "name", "") or "")
                fn_args = dict(getattr(call, "args", None) or {})
                tool_output = await self._execute_bridge_tool(
                    fn_name=fn_name,
                    fn_args=fn_args,
                    agent_name=agent_name,
                    goal=goal,
                    bridge_task_id=bridge_task_id,
                    bridge_client=bridge_client,
                )
                tool_results.append({"tool": fn_name, "result": tool_output})

                if tool_output.get("file_id"):
                    drive_file_id = str(tool_output["file_id"])
                if tool_output.get("file_url"):
                    drive_file_url = str(tool_output["file_url"])
                elif not drive_file_url and tool_output.get("sheet_url"):
                    drive_file_url = str(tool_output["sheet_url"])

                response_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": tool_output},
                    )
                )

            contents.append(types.Content(role="user", parts=response_parts))

            # Hard cap reached — do not perform a 4th Gemini call
            if step == hard_limit:
                final_summary = (getattr(response, "text", None) or "").strip()

        if not final_summary:
            if drive_file_url:
                final_summary = (
                    f"{agent_name} đã hoàn thành bản nháp sau {steps_used} bước và lưu tại "
                    f"{drive_file_url}. Đang chờ CEO duyệt."
                )
            else:
                final_summary = (
                    f"{agent_name} đã hoàn tất {steps_used} bước xử lý và dừng chờ CEO phản hồi."
                )

        return AutonomousTaskResult(
            summary=final_summary,
            drive_file_id=drive_file_id,
            drive_file_url=drive_file_url,
            reasoning_steps=steps_used,
            tokens_used=total_tokens,
            model_used=self.model_autonomous,
            tool_results=tool_results,
        )

    async def _execute_bridge_tool(
        self,
        *,
        fn_name: str,
        fn_args: dict[str, Any],
        agent_name: str,
        goal: str,
        bridge_task_id: str,
        bridge_client: WorkspaceBridgeClient,
    ) -> dict[str, Any]:
        try:
            if fn_name == "create_doc":
                return await bridge_client.create_doc(
                    title=str(fn_args.get("title") or goal[:80]),
                    content=str(fn_args.get("content") or ""),
                    agent_name=agent_name,
                    goal=goal,
                    summary=str(fn_args.get("summary") or ""),
                    task_id=bridge_task_id,
                )

            if fn_name == "save_file":
                return await bridge_client.save_file(
                    file_name=str(fn_args.get("file_name") or "draft.md"),
                    content=str(fn_args.get("content") or ""),
                    agent_name=agent_name,
                    goal=goal,
                    summary=str(fn_args.get("summary") or ""),
                    task_id=bridge_task_id,
                )

            if fn_name == "append_sheet":
                sheet_name = str(fn_args.get("sheet_name") or "")
                raw_rows = fn_args.get("rows_json")
                if isinstance(raw_rows, str):
                    rows = json.loads(raw_rows)
                elif isinstance(raw_rows, list):
                    rows = raw_rows
                else:
                    return {"ok": False, "error": "rows_json phải là mảng JSON hợp lệ."}

                if not isinstance(rows, list) or not rows:
                    return {"ok": False, "error": "rows_json phải chứa ít nhất 1 dòng."}

                return await bridge_client.append_sheet(
                    sheet_name=sheet_name,
                    rows=rows,
                )

            return {"ok": False, "error": f"Công cụ không được hỗ trợ: {fn_name}"}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
