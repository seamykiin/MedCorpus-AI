import os
from typing import List

try:
    # pyrefly: ignore [missing-import]
    from pydantic_settings import BaseSettings, SettingsConfigDict
    class BaseConfig(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )
except ImportError:
    from pydantic import BaseModel
    class BaseConfig(BaseModel): # type: ignore
        pass

class Settings(BaseConfig):
    APP_NAME: str = os.getenv("APP_NAME", "MedCorpus AI Backend")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,*")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "medcorpus-super-secret-jwt-key-change-in-production-2025")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./medcorpus.db")
    
    # AI Providers & Model Routing
    ACTIVE_LLM_PROVIDER: str = os.getenv("ACTIVE_LLM_PROVIDER", "groq") # groq, gemini, local, openai, ollama
    
    # Cloud API: Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Cloud API: Groq (ultra-fast inference)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    
    # Cloud API: OpenAI / Anthropic
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Locally Trained / Local LLM
    # Supports Ollama OpenAI-compat (http://localhost:11434/v1), vLLM (http://localhost:8000/v1), llama.cpp, or custom local server
    LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
    LOCAL_LLM_MODEL: str = os.getenv("LOCAL_LLM_MODEL", "medcorpus-local")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    
    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()

