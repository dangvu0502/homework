import json

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src.database.core import get_db
from src.models import Job, JobStatus
from src.schemas import JobResponse, JobStatusResponse
from src.queue.tasks import process_image_task
from src.settings import config
from src.storage.s3 import storage
from src.constants import MAX_UPLOAD_SIZE

router = APIRouter()

@router.post("/upload", response_model=JobResponse)
async def upload_image(
    file: UploadFile = File(...),
    callback_url: str | None = Header(None, alias="X-Callback-URL"),
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
            model_name=config.openrouter_model,
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
            s3_key=s3_key
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


@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
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


@router.get("/results/{job_id}")
def get_job_results(job_id: str, db: Session = Depends(get_db)):
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
