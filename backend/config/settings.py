import dotenv
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fptu_guide"

    # Supabase Auth
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # Rate Limiting
    CHAT_RATE_LIMIT: int = 5
    CHAT_MAX_INPUT_LENGTH: int = 3000

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = (".env", ".env.local")
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()
