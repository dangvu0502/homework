import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Header, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.celery.models import Job, JobStatus
from src.llm import detect_ui_elements
from src.schemas import PredictionResponse, JobResponse, JobStatusResponse
from src.settings import config
from src.storage import storage
from src.celery.tasks import process_image_task
from src.websocket_manager import manager

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB limit

api_router = APIRouter()

@api_router.get("/models")
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


@api_router.post("/predict", response_model=PredictionResponse)
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


# Scalable API endpoints
@api_router.post("/upload", response_model=JobResponse)
async def upload_image(
    file: UploadFile = File(...),
    model_name: Optional[str] = None,
    callback_url: Optional[str] = Header(None, alias="X-Callback-URL"),
    db: Session = Depends(get_db)
):
    """
    Upload an image for asynchronous UI element detection.
    
    Returns a job_id that can be used to check status and retrieve results.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size
    if file.size and file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Use first model from config if not specified
    if not model_name:
        if not config.models:
            raise HTTPException(status_code=500, detail="No models configured")
        model_name = next(iter(config.models.keys()))
    
    # Validate model exists
    if model_name not in config.models:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' not found")
    
    try:
        # Read file content
        file_data = await file.read()
        
        # Upload to S3
        s3_key, s3_url = storage.upload_image(
            file_data=file_data,
            content_type=file.content_type,
            original_filename=file.filename
        )
        
        # Create job record
        job = Job(
            model_name=model_name,
            s3_key=s3_key,
            s3_url=s3_url,
            original_filename=file.filename,
            content_type=file.content_type,
            file_size=len(file_data),
            callback_url=callback_url
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Queue the task
        task = process_image_task.delay(
            job_id=str(job.id),
            s3_key=s3_key,
            model_name=model_name
        )
        
        # Update job with worker ID
        job.worker_id = task.id
        db.commit()
        
        return JobResponse(
            task_id=str(job.id),
            status=job.status.value,
            message="Image uploaded successfully",
            created_at=job.created_at
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time job updates."""
    await manager.connect(websocket)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            if data.get("type") == "subscribe":
                job_ids = data.get("job_ids", [])
                for job_id in job_ids:
                    manager.subscribe_to_job(websocket, job_id)
                
                # Send acknowledgment
                await websocket.send_json({
                    "type": "subscribed",
                    "job_ids": job_ids
                })
            
            elif data.get("type") == "unsubscribe":
                job_ids = data.get("job_ids", [])
                for job_id in job_ids:
                    manager.unsubscribe_from_job(websocket, job_id)
                
                await websocket.send_json({
                    "type": "unsubscribed",
                    "job_ids": job_ids
                })
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@api_router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Check the status of a job.
    
    Returns current status and progress information.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    response = JobStatusResponse(
        task_id=str(job.id),
        status=job.status.value,
        created_at=job.created_at
    )
    
    if job.status == JobStatus.PROCESSING:
        response.progress = "AI analyzing image..."
        response.started_at = job.started_at
    elif job.status == JobStatus.COMPLETED:
        response.message = "Analysis complete"
        response.completed_at = job.completed_at
        response.processing_time = job.processing_time
    elif job.status == JobStatus.FAILED:
        response.error = job.error_message
        response.completed_at = job.completed_at
    
    return response


@api_router.get("/results/{job_id}")
async def get_job_results(job_id: str, db: Session = Depends(get_db)):
    """
    Get the results of a completed job.
    
    Returns the UI element detection results.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400, 
            detail=f"Job is not completed. Current status: {job.status.value}"
        )
    
    if not job.result_data:
        raise HTTPException(status_code=500, detail="No results found for this job")
    
    try:
        # Parse the stored JSON results
        results = json.loads(job.result_data)
        return results
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse results")
