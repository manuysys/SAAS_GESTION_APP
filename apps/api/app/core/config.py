from functools import lru_cache
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_KNOWN_WEAK_SECRETS = frozenset(
    {
        "dev-only-change-me-0123456789abcdef",
        "change-me-in-local-env",
        "secret",
        "jwt-secret",
    }
)


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
    allowed_hosts: list[str] = Field(default_factory=lambda: ["*"])

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

    ai_provider: Literal["deterministic", "openai_compatible", "ollama"] = "deterministic"
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = ""
    ai_timeout_seconds: int = 30
    ai_monthly_token_limit: int = 200_000
    ai_input_cost_per_1k: float = 0.0
    ai_output_cost_per_1k: float = 0.0
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gpt-oss:20b"

    platform_admin_emails: list[str] = Field(default_factory=list)

    whatsapp_encryption_key: str = ""
    whatsapp_api_version: str = "v23.0"
    whatsapp_verify_token: str = ""

    rate_limit_enabled: bool = True
    rate_limit_auth_per_minute: int = 10
    rate_limit_public_per_minute: int = 30

    lockout_max_attempts: int = 5
    lockout_window_minutes: int = 15
    audit_enabled: bool = True

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.app_env.lower() != "production":
            return self

        errors: list[str] = []

        if len(self.jwt_secret) < 32 or self.jwt_secret.lower() in _KNOWN_WEAK_SECRETS:
            errors.append("JWT_SECRET must be at least 32 characters and not a known default value")

        if self.app_debug:
            errors.append("APP_DEBUG must be false in production")

        if not self.cookie_secure:
            errors.append("COOKIE_SECURE must be true in production")

        for origin in self.api_cors_origins:
            lowered = origin.lower()
            if "localhost" in lowered or "127.0.0.1" in lowered:
                errors.append("API_CORS_ORIGINS cannot contain localhost/127.0.0.1 in production")
                break

        if self.cookie_samesite != "none" and self._has_cross_site_origin():
            errors.append(
                "COOKIE_SAMESITE must be 'none' when API_CORS_ORIGINS contains cross-site origins"
            )

        if errors:
            raise ValueError("Production misconfiguration: " + "; ".join(errors))

        return self

    def _has_cross_site_origin(self) -> bool:
        api_host = urlparse(self.api_url).hostname or ""
        for origin in self.api_cors_origins:
            origin_host = urlparse(origin).hostname or ""
            if origin_host and origin_host != api_host:
                return True
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()


settings = get_settings()
