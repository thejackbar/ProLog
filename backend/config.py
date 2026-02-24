from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Literal


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_EXPIRY_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # Anthropic / Claude
    CLAUDE_API_KEY: str = ""

    # Environment
    NODE_ENV: Literal["development", "production", "test"] = "development"

    # CORS – frontend origin(s), comma-separated if multiple
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Email / SMTP (optional – if unset, reset URLs are logged to stdout)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FROM_EMAIL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        # asyncpg driver required
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @property
    def frontend_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.NODE_ENV == "production"


settings = Settings()  # type: ignore[call-arg]
