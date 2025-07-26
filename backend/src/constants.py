"""Centralized constants for the application."""

# File upload limits
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB limit

# Supported file types
SUPPORTED_IMAGE_TYPES = ('image/',)

# UI element types
UI_ELEMENT_TYPES = ["button", "input", "radio", "dropdown"]  # Used in LLM prompts

# Job cleanup
JOB_RETENTION_DAYS = 7  # Keep jobs for 7 days

# Worker scaling
MIN_WORKERS = 2
MAX_WORKERS = 20
QUEUE_SCALE_UP_THRESHOLD = 100
QUEUE_SCALE_DOWN_THRESHOLD = 10

# API versioning
API_VERSION = "0.2.0"
API_PREFIX = "/api/v1"

# Default directories for CLI
DEFAULT_PREDICTIONS_DIR = "dataset/labels/predictions"
DEFAULT_GROUND_TRUTH_DIR = "dataset/labels/ground_truth"
DEFAULT_IMAGE_DIR = "dataset/images"