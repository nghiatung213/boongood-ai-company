"""Application configuration loaded exclusively from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for Boongood AI Company Backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gemini API
    gemini_api_key: str = ""
    gemini_model_passive: str = "gemini-3.5-flash-lite"
    gemini_model_autonomous: str = "gemini-3.8-flash"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Layer 1 Workspace Bridge (Google Apps Script /exec)
    bridge_url: str = ""
    bridge_secret: str = ""

    # Security & CORS
    backend_api_key: str = ""
    allowed_origins: str = "*"

    # Hard token-saving guardrails
    max_chat_history: int = Field(default=8, ge=1, le=8)
    max_autonomous_steps: int = Field(default=3, ge=1, le=3)
    max_image_bytes: int = Field(default=10 * 1024 * 1024, ge=1024)

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.allowed_origins.strip()
        if not raw or raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
