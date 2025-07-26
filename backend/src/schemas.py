from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TagType(str, Enum):
    BUTTON = "button"
    INPUT = "input"
    RADIO = "radio"
    DROPDOWN = "dropdown"


class AnnotationSchema(BaseModel):
    """Schema for annotation data."""
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    tag: TagType


class DetectionResult(BaseModel):
    """Result from LLM UI element detection."""
    annotations: list[AnnotationSchema]


class PredictionResponse(BaseModel):
    """Response from LLM prediction."""
    annotations: list[AnnotationSchema]
    processing_time: float | None = None


class JobResponse(BaseModel):
    """Response when creating a new job."""
    task_id: str
    status: str
    message: str
    created_at: datetime


class JobStatusResponse(BaseModel):
    """Response for job status check."""
    task_id: str
    status: str
    progress: str | None = None
    message: str | None = None
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    processing_time: float | None = None
