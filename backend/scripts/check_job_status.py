#!/usr/bin/env python3
"""
Script to check job status in the database.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from src.database.core import SessionLocal
from src.models import Job, JobStatus
from sqlalchemy import func


def check_job_statistics():
    """Get statistics about jobs in the database."""
    db = SessionLocal()
    
    try:
        # Count jobs by status
        status_counts = db.query(
            Job.status,
            func.count(Job.id).label('count')
        ).group_by(Job.status).all()
        
        print("Job Statistics:")
        print("-" * 40)
        total = 0
        for status, count in status_counts:
            print(f"{status.value:12} : {count:5} jobs")
            total += count
        print("-" * 40)
        print(f"{'TOTAL':12} : {total:5} jobs")
        
        # Find old pending jobs
        print("\n\nPending Jobs Details:")
        print("-" * 80)
        
        pending_jobs = db.query(Job).filter(
            Job.status == JobStatus.PENDING
        ).order_by(Job.created_at.desc()).all()
        
        if not pending_jobs:
            print("No pending jobs found")
        else:
            print(f"Found {len(pending_jobs)} pending jobs:\n")
            print(f"{'Job ID':38} | {'Created':20} | {'Model':20}")
            print("-" * 80)
            
            for job in pending_jobs:
                age = datetime.utcnow() - job.created_at
                age_str = f"{int(age.total_seconds() / 60)} min ago"
                print(f"{str(job.id):38} | {age_str:20} | {job.model_name or 'None':20}")
        
        # Find recently failed jobs
        print("\n\nRecent Failed Jobs (last hour):")
        print("-" * 100)
        
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        failed_jobs = db.query(Job).filter(
            Job.status == JobStatus.FAILED,
            Job.completed_at > one_hour_ago
        ).order_by(Job.completed_at.desc()).limit(10).all()
        
        if not failed_jobs:
            print("No failed jobs in the last hour")
        else:
            print(f"{'Job ID':38} | {'Failed':20} | {'Error':40}")
            print("-" * 100)
            
            for job in failed_jobs:
                age = datetime.utcnow() - job.completed_at
                age_str = f"{int(age.total_seconds() / 60)} min ago"
                error_msg = (job.error_message or "Unknown")[:40]
                print(f"{str(job.id):38} | {age_str:20} | {error_msg:40}")
                
    finally:
        db.close()


def reset_stuck_pending_jobs():
    """Reset stuck pending jobs by deleting them from the database."""
    db = SessionLocal()
    
    try:
        # Find jobs that have been pending for more than 10 minutes
        threshold_time = datetime.utcnow() - timedelta(minutes=10)
        
        stuck_jobs = db.query(Job).filter(
            Job.status == JobStatus.PENDING,
            Job.created_at < threshold_time
        ).all()
        
        if not stuck_jobs:
            print("\nNo stuck jobs to reset (pending > 10 minutes)")
            return
        
        print(f"\nFound {len(stuck_jobs)} stuck pending jobs")
        response = input("Do you want to delete these jobs? (y/N): ")
        
        if response.lower() == 'y':
            for job in stuck_jobs:
                db.delete(job)
            db.commit()
            print(f"Deleted {len(stuck_jobs)} stuck jobs")
        else:
            print("Cancelled")
            
    finally:
        db.close()


if __name__ == "__main__":
    check_job_statistics()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        reset_stuck_pending_jobs()