from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Gemini
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    gemini_model: str = Field(..., alias="GEMINI_MODEL")
    gemini_fallback_model: str = Field(..., alias="GEMINI_FALLBACK_MODEL")
    gemini_audio_model: str = Field(..., alias="GEMINI_AUDIO_MODEL")
    gemini_classify_model: str = Field(..., alias="GEMINI_CLASSIFY_MODEL")

    # MCP
    kapruka_mcp_url: str = Field(..., alias="KAPRUKA_MCP_URL")

    # Server — "*" or comma-separated origins, e.g. "https://a.com,https://b.com"
    cors_origins_raw: str = Field(default="*", alias="CORS_ORIGINS")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


settings = Settings()
