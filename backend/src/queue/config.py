from celery.schedules import crontab

# Celery beat schedule for periodic tasks
beat_schedule = {
    'monitor-queue-size': {
        'task': 'check_queue_size',
        'schedule': 30.0,  # Run every 30 seconds
        'options': {
            'queue': 'monitoring',
            'priority': 10
        }
    },
    'cleanup-old-jobs': {
        'task': 'cleanup_old_jobs',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
        'options': {
            'queue': 'maintenance'
        }
    }
}
