"""Pydantic schemas for request validation and structured API responses."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

AgentMode = Literal["PASSIVE", "AUTONOMOUS"]
AgentState = Literal["IDLE", "WORKING", "COLLABORATING", "WAITING_APPROVAL"]
SaveType = Literal["doc", "file", "sheet"]
SheetName = Literal["Market_Data", "Finance_Models"]
TargetFolder = Literal["01_Market_Research", "02_Prototypes_Drafts", "03_Data_Calculations"]
ReviewDecision = Literal["approve", "reject"]


class AgentOut(BaseModel):
    id: str
    display_name: str
    role: str
    mode: AgentMode
    current_state: AgentState
    current_task_summary: str | None = ""
    updated_at: str | None = None


class AgentModeUpdateRequest(BaseModel):
    mode: AgentMode


class SearchSource(BaseModel):
    title: str
    url: str


class ChatJsonRequest(BaseModel):
    agent_id: str = Field(..., min_length=1, examples=["rachel"])
    message: str = Field(..., min_length=1, examples=["Nhận xét giúp mình bố cục hộp bánh này nhé!"])
    session_id: str = Field(default="default", min_length=1)
    use_search: bool = False
    image_base64: str | None = Field(
        default=None,
        description="Chuỗi ảnh mã hóa base64 (có thể kèm hoặc không kèm tiền tố data:image/...;base64,).",
    )
    image_mime_type: str | None = Field(
        default=None,
        description="MIME type của ảnh (ví dụ: image/jpeg, image/png, image/webp).",
    )


class ChatResponse(BaseModel):
    agent_id: str
    agent_name: str
    session_id: str
    user_message_id: str
    assistant_message_id: str
    reply: str
    has_image: bool
    used_search: bool
    search_sources: list[SearchSource] = Field(default_factory=list)
    tokens_used: int
    model_used: str


class SaveToDriveRequest(BaseModel):
    save_type: SaveType = Field(
        default="doc",
        description="'doc' (Google Docs vào 00_Inbox_Drafts + Tasks_Log), 'file' (text/HTML/MD), hoặc 'sheet' (Market_Data/Finance_Models).",
    )
    message_id: str | None = Field(
        default=None,
        description="UUID của tin nhắn trong chat_messages cần lưu (tự lấy nội dung & tên nhân vật).",
    )
    agent_id: str | None = Field(
        default=None,
        description="Bắt buộc nếu không truyền message_id.",
    )
    title: str | None = Field(
        default=None,
        description="Tiêu đề Google Docs (khi save_type='doc').",
    )
    content: str | None = Field(
        default=None,
        description="Nội dung tùy chỉnh để lưu (nếu không lấy từ message_id).",
    )
    summary: str | None = Field(
        default=None,
        description="Tóm tắt ngắn ghi vào cột Summary của Tasks_Log.",
    )
    file_name: str | None = Field(
        default=None,
        description="Tên file khi save_type='file' (ví dụ: landing_draft.html hoặc ideas.md).",
    )
    sheet_name: SheetName | None = Field(
        default=None,
        description="Tên tab khi save_type='sheet': 'Market_Data' hoặc 'Finance_Models'.",
    )
    rows: list[dict[str, Any]] | None = Field(
        default=None,
        description="Danh sách dòng dữ liệu khi save_type='sheet'.",
    )


class SaveToDriveResponse(BaseModel):
    ok: bool = True
    save_type: SaveType
    tokens_used: int = 0
    message_id: str | None = None
    task_id: str | None = None
    file_id: str | None = None
    file_url: str | None = None
    sheet_name: str | None = None
    sheet_url: str | None = None
    rows_added: int | None = None


class CreateTaskRequest(BaseModel):
    agent_id: str = Field(..., min_length=1, examples=["ross"])
    goal: str = Field(
        ...,
        min_length=1,
        examples=["Nghiên cứu 3 đối thủ bánh quy thủ công tại TP.HCM và lập báo cáo nháp."],
    )
    context: str | None = Field(
        default=None,
        description="Thông tin bổ sung ngắn gọn (giá mục tiêu, nhóm khách hàng, ghi chú).",
    )


class TaskOut(BaseModel):
    id: str
    bridge_task_id: str | None = None
    agent_id: str
    goal: str
    status: str
    result_summary: str | None = None
    drive_file_id: str | None = None
    drive_file_url: str | None = None
    target_folder: str | None = None
    ceo_feedback: str | None = None
    reasoning_steps: int = 0
    tokens_used: int = 0
    model_used: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class TaskReviewRequest(BaseModel):
    decision: ReviewDecision
    target_folder: TargetFolder | None = Field(
        default=None,
        description="Bắt buộc khi decision='approve' và task có file Drive: 01_Market_Research, 02_Prototypes_Drafts, hoặc 03_Data_Calculations.",
    )
    ceo_feedback: str | None = Field(
        default=None,
        description="Góp ý của CEO (lưu vào Supabase và cột CEO_Feedback trong Tasks_Log).",
    )


class TaskReviewResponse(BaseModel):
    ok: bool = True
    task: TaskOut
    agent_state: AgentState
    bridge_result: dict[str, Any] | None = None
    tokens_used: int = 0
