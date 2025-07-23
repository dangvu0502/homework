from pathlib import Path
from typing import Dict, Any, Optional
import yaml
import logging
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
    
    # Worker configuration
    worker_concurrency: int = Field(
        default=4,
        description="Number of concurrent Celery workers"
    )
    queue_threshold_for_scaling: int = Field(
        default=100,
        description="Queue size threshold for auto-scaling workers"
    )
    
    # Model configuration
    model_config_path: str = Field(
        default="model_config.yaml",
        description="Path to model configuration YAML file"
    )
    
    # Computed fields
    models: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._load_model_config()
    
    def _load_model_config(self):
        """Load model configuration from YAML file."""
        # Try relative to backend directory first
        config_path = Path(__file__).resolve().parent.parent / self.model_config_path
        
        # If not found, try current directory
        if not config_path.exists():
            config_path = Path(self.model_config_path)
        
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    data = yaml.safe_load(f) or {}
                
                # Load models section
                if "models" in data and isinstance(data["models"], dict):
                    self.models = data["models"]
                    logger.info(f"Loaded {len(self.models)} models from {config_path}")
                    
            except Exception as e:
                logger.error(f"Failed to load model config from {config_path}: {e}")
        else:
            logger.warning(f"Model config file not found at {config_path}")
    


# Create global settings instance
config = Settings()