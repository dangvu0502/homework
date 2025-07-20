from pathlib import Path
from typing import Dict, Any
import yaml
import logging

logger = logging.getLogger(__name__)

class Config:
    def __init__(self):
        self.models: Dict[str, Dict[str, Any]] = {}
        self._load_config()
    
    def _load_config(self):
        config_path = Path(__file__).resolve().parent.parent / "model_config.yaml"
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    data = yaml.safe_load(f) or {}
                
                # Load models section
                if "models" in data and isinstance(data["models"], dict):
                    self.models = data["models"]
                    
            except Exception as e:
                logger.error(f"Failed to load config: {e}")


# Global config instance
config = Config()