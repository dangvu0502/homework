import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.llm import detect_ui_elements
from src.schemas import PredictionResponse
from src.settings import config
from src.constants import MAX_UPLOAD_SIZE

base_router = APIRouter()

@base_router.get("/models")
async def get_available_models():
    """
    Get list of available models for UI element detection.
    """
    try:
        models = []
        for model_id, model_config in config.models.items():
            model_info = {
                "id": model_id,
                "name": model_config.get("name", model_id)
            }
            models.append(model_info)

        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@base_router.post("/predict", response_model=PredictionResponse)
async def predict_ui_elements(file: UploadFile = File(...), model_name: str = Form(...)):
    """
    Predict UI elements in an uploaded image using LLM.
    This endpoint accepts an uploaded image file and returns detected UI elements (Button, Input, Radio, Dropdown, Text)
    """
    start_time = time.time()

    # Validate file type and size
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate file size
    if file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # Validate model exists
    if model_name not in config.models:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' not found")

    try:
        # Read file content directly into memory
        image_data = await file.read()

        # Call LLM for prediction
        detection_result = await detect_ui_elements(
            image_data=image_data,
            image_type=file.content_type,
            model_name=model_name
        )

        processing_time = time.time() - start_time

        return PredictionResponse(
            annotations=detection_result.annotations,
            image_dimensions=detection_result.dimensions,
            processing_time=processing_time
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
