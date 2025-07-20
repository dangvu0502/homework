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


class PredictionRequest(BaseModel):
    """Request for LLM prediction."""
    image_path: str
    model_name: str


class PredictionResponse(BaseModel):
    """Response from LLM prediction."""
    annotations: list[AnnotationSchema]
    processing_time: float | None = None
