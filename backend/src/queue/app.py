from celery import Celery

from src.settings import config

# Create Celery app instance
celery_app = Celery(
    "ui_annotation_worker",
    broker=config.redis_url,
    backend=config.redis_url,
    include=["src.queue.tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,  # Results expire after 1 hour
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # Soft limit at 4 minutes
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks to prevent memory leaks
)

# Auto-scaling configuration
celery_app.conf.update(
    worker_autoscaler="celery.worker.autoscale:Autoscaler",
    worker_autoscale_max=20,  # Maximum 20 workers
    worker_autoscale_min=2,   # Minimum 2 workers
)


# Configure task routing (commented out for now to use default queue)
# celery_app.conf.task_routes = {
#     'process_image': {'queue': 'images'},
#     'check_queue_size': {'queue': 'monitoring'},
#     'cleanup_old_jobs': {'queue': 'maintenance'}
# }
