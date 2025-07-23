#!/usr/bin/env python
"""
Celery worker entry point.

To run the worker:
    celery -A src.celery.worker worker --loglevel=info

To run with autoscaling:
    celery -A src.celery.worker worker --loglevel=info --autoscale=20,2

To run with specific concurrency:
    celery -A src.celery.worker worker --loglevel=info --concurrency=4

To run flower for monitoring:
    celery -A src.celery.worker flower
"""

from src.celery.app import celery_app
from src.celery.tasks import process_image_task, check_queue_size_task, cleanup_old_jobs_task  # Import tasks to register them

if __name__ == '__main__':
    celery_app.start()