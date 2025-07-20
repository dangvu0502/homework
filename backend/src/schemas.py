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


class ImageDimensions(BaseModel):
    """Image dimensions detected by LLM."""
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class DetectionResult(BaseModel):
    """Result from LLM UI element detection."""
    annotations: list[AnnotationSchema]
    dimensions: ImageDimensions | None = None


class PredictionResponse(BaseModel):
    """Response from LLM prediction."""
    annotations: list[AnnotationSchema]
    image_dimensions: ImageDimensions | None = None
    processing_time: float | None = None
