import asyncio
import json
import time
from datetime import datetime
from typing import Any

import requests

from src.database.core import SessionLocal, get_db
from src.llm import detect_ui_elements
from src.models import Job, JobStatus
from src.queue.app import celery_app
from src.settings import config
from src.storage.s3 import storage
from src.ws.pubsub import publisher
from src.constants import JOB_RETENTION_DAYS, QUEUE_SCALE_UP_THRESHOLD, QUEUE_SCALE_DOWN_THRESHOLD, MIN_WORKERS, MAX_WORKERS


@celery_app.task(bind=True, name="process_image")
def process_image_task(self, job_id: str, s3_key: str, model_name: str) -> dict[str, Any]:
    """
    Process a single image for UI element detection.

    Args:
        job_id: Unique job identifier
        s3_key: S3 key where the image is stored
        model_name: Model to use for detection

    Returns:
        Dictionary with detection results
    """
    start_time = time.time()

    # Update job status to processing
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        job.worker_id = self.request.id
        db.commit()

        # Send WebSocket update
        publisher.publish_job_update(job_id, {
            "status": "processing",
            "message": "AI analyzing image...",
            "started_at": job.started_at.isoformat()
        })
    finally:
        db.close()

    try:
        # Download image from S3
        response = storage.client.get_object(Bucket=config.s3_bucket_name, Key=s3_key)
        image_data = response['Body'].read()
        content_type = response.get('ContentType', 'image/png')

        # Detect UI elements
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            detection_result = loop.run_until_complete(
                detect_ui_elements(
                    image_data=image_data,
                    image_type=content_type,
                    model_name=model_name
                )
            )
        finally:
            loop.close()

        # Prepare results
        results = {
            "task_id": job_id,
            "image": s3_key,
            "analysis": {
                "annotations": [ann.model_dump() for ann in detection_result.annotations],
                "image_dimensions": detection_result.dimensions.model_dump() if detection_result.dimensions else None,
                "ui_elements": [ann.tag for ann in detection_result.annotations],
                "total_elements": len(detection_result.annotations)
            },
            "model_used": model_name,
            "processing_time": time.time() - start_time,
            "completed_at": datetime.utcnow().isoformat()
        }

        # Store results in database
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.result_data = json.dumps(results)
            job.processing_time = results["processing_time"]
            db.commit()

            # Send WebSocket update
            publisher.publish_job_update(job_id, {
                "status": "completed",
                "message": "Analysis complete",
                "results": results,
                "processing_time": results["processing_time"]
            })

            # Send webhook callback if configured
            if job.callback_url:
                try:
                    webhook_data = {
                        "job_id": job_id,
                        "status": "completed",
                        "results": results
                    }
                    response = requests.post(
                        job.callback_url,
                        json=webhook_data,
                        timeout=10
                    )
                    print(f"Webhook sent to {job.callback_url}, status: {response.status_code}")
                except Exception as webhook_error:
                    print(f"Failed to send webhook: {webhook_error}")
                    # Don't fail the job if webhook fails
        finally:
            db.close()

        return results

    except Exception as e:
        # Update job status to failed
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()

            # Send WebSocket update
            publisher.publish_job_update(job_id, {
                "status": "failed",
                "message": "Processing failed",
                "error": str(e)
            })

            # Send webhook callback for failure
            if job.callback_url:
                try:
                    webhook_data = {
                        "job_id": job_id,
                        "status": "failed",
                        "error": str(e)
                    }
                    response = requests.post(
                        job.callback_url,
                        json=webhook_data,
                        timeout=10
                    )
                    print(f"Webhook sent to {job.callback_url}, status: {response.status_code}")
                except Exception as webhook_error:
                    print(f"Failed to send webhook: {webhook_error}")
        finally:
            db.close()

        raise


@celery_app.task(name="check_queue_size")
def check_queue_size_task():
    """
    Monitor queue size and trigger auto-scaling if needed.
    This task should be scheduled to run periodically.
    """
    # Get current queue size
    inspect = celery_app.control.inspect()
    stats = inspect.stats()

    if not stats:
        return {"queue_size": 0, "action": "none"}

    # Calculate total pending tasks
    total_pending = 0
    for _worker_name, worker_stats in stats.items():
        total_pending += worker_stats.get('total', {}).get('tasks.pending', 0)

    # Check if we need to scale
    current_workers = len(stats)
    action = "none"

    if total_pending > QUEUE_SCALE_UP_THRESHOLD and current_workers < MAX_WORKERS:
        # Scale up
        action = "scale_up"
        # In production, this would trigger container orchestration to add workers
        # For now, we'll log the recommendation
        print(f"SCALE UP: Queue size {total_pending} exceeds threshold. Current workers: {current_workers}")
    elif total_pending < QUEUE_SCALE_DOWN_THRESHOLD and current_workers > MIN_WORKERS:
        # Scale down
        action = "scale_down"
        print(f"SCALE DOWN: Queue size {total_pending} is low. Current workers: {current_workers}")

    return {
        "queue_size": total_pending,
        "current_workers": current_workers,
        "action": action,
        "timestamp": datetime.utcnow().isoformat()
    }


@celery_app.task(name="cleanup_old_jobs")
def cleanup_old_jobs_task():
    """
    Clean up old completed/failed jobs and their S3 data.
    Runs daily to keep the database clean.
    """
    from datetime import timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=JOB_RETENTION_DAYS)

    with next(get_db()) as db:
        # Find old completed/failed jobs
        old_jobs = db.query(Job).filter(
            Job.completed_at < cutoff_date,
            Job.status.in_([JobStatus.COMPLETED, JobStatus.FAILED])
        ).all()

        s3_client = storage.client
        deleted_count = 0

        for job in old_jobs:
            try:
                # Delete S3 object
                if job.s3_key:
                    s3_client.delete_object(
                        Bucket=config.s3_bucket_name,
                        Key=job.s3_key
                    )

                # Delete job record
                db.delete(job)
                deleted_count += 1

            except Exception as e:
                print(f"Error cleaning up job {job.id}: {e}")
                continue

        db.commit()

        return {
            "deleted_jobs": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "timestamp": datetime.utcnow().isoformat()
        }
