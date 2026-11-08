from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "SaaS Gestion"
    app_env: str = "development"
    app_debug: bool = True
    api_url: str = "http://localhost:8000"
    api_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = (
        "postgresql+asyncpg://saas:saas_dev_password@127.0.0.1:55432/saas_gestion_dev"
    )
    database_url_sync: str = (
        "postgresql+psycopg://saas:saas_dev_password@127.0.0.1:55432/saas_gestion_dev"
    )

    jwt_secret: str = "dev-only-change-me-0123456789abcdef"  # noqa: S105
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str = "localhost"

    storage_backend: str = "local"
    storage_local_path: str = ".local/uploads"
    storage_max_file_mb: int = 10

    ai_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gpt-oss:20b"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
