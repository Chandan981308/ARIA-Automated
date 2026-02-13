from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "ARIA Voice Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database - Default to SQLite for easy testing, can be overridden with MySQL
    DATABASE_URL: str = "sqlite:///./aria_crm.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 40

    # MySQL settings (optional - set these in .env to use MySQL instead of SQLite)
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "aria_crm"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Tata Tele API
    TATA_TELE_API_URL: str = "https://api.cloudphone.tatatele.in/v1/"
    TATA_TELE_API_KEY: str = ""
    TATA_TELE_API_SECRET: str = ""

    # Smartflo API
    SMARTFLO_API_URL: str = "https://api-smartflo.tatateleservices.com/v1"
    SMARTFLO_EMAIL: str = "OR184608"
    SMARTFLO_PASSWORD: str = "Rscgroupdholera@415763"

    # Deepgram STT
    DEEPGRAM_API_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_REALTIME_MODEL: str = "gpt-4o-realtime-preview"

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: str = ""

    # Pinecone
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX: str = "aria-leads"

    # Calling settings
    CALLING_HOURS_START: str = "09:00"
    CALLING_HOURS_END: str = "21:00"
    MAX_CONCURRENT_CALLS: int = 100
    DEFAULT_MAX_ATTEMPTS: int = 3
    DEFAULT_RETRY_INTERVAL_HOURS: int = 4

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
