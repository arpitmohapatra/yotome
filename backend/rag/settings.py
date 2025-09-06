"""Configuration settings for the RAG application."""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Azure OpenAI Configuration
    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_deployment: str = "gpt-4o-mini"
    azure_openai_embed_deployment: str = "text-embedding-3-large"
    azure_openai_api_version: str = "2024-10-21"
    
    # Vector Store Configuration
    chroma_dir: str = "./data/chroma"
    
    # RAG Parameters
    max_tokens: int = 1024
    temperature: float = 0.2
    top_k: int = 6
    chunk_size: int = 800
    chunk_overlap: int = 100
    
    # File Upload Configuration
    allowed_mime: str = "application/pdf,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    max_file_size: int = 50000000  # 50MB
    
    # Environment
    environment: str = "development"
    log_level: str = "INFO"
    
    # Frontend URL (for CORS)
    frontend_url: str = "http://localhost:5173"
    
    # Optional: Authentication
    secret_key: str = "dev-secret-key-change-in-production"
    session_expire_minutes: int = 1440  # 24 hours
    
    @property
    def allowed_mime_types(self) -> List[str]:
        """Get list of allowed MIME types."""
        return [mime.strip() for mime in self.allowed_mime.split(",")]
    
    @property
    def chroma_persist_directory(self) -> str:
        """Get absolute path for ChromaDB persistence directory."""
        if os.path.isabs(self.chroma_dir):
            return self.chroma_dir
        return os.path.abspath(self.chroma_dir)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
