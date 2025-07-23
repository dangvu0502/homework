import logging
from pathlib import Path
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Redis configuration
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for Celery broker and results"
    )

    # S3 configuration
    s3_access_key: str = Field(
        ...,
        description="AWS access key ID"
    )
    s3_secret_key: str = Field(
        ...,
        description="AWS secret access key"
    )
    s3_bucket_name: str = Field(
        ...,
        description="S3 bucket name for storing images"
    )
    s3_region: str = Field(
        default="us-east-1",
        description="AWS region"
    )

    # Database configuration
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/ui_annotations",
        description="PostgreSQL database URL"
    )

    # API configuration
    api_host: str = Field(
        default="0.0.0.0",
        description="API server host"
    )
    api_port: int = Field(
        default=8000,
        description="API server port"
    )

    # OpenRouter configuration
    openrouter_api_key: str = Field(
        ...,
        description="OpenRouter API key for accessing models"
    )
    openrouter_model: str = Field(
        default="openai/gpt-4o",
        description="OpenRouter model to use for UI detection"
    )




# Create global settings instance
config = Settings()
