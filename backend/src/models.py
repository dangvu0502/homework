import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from src.database.core import Base


class JobStatus(str, enum.Enum):
    """Job status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    """Job model for tracking image processing tasks."""

    __tablename__ = "jobs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Job metadata
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True)
    model_name = Column(String(100), nullable=False)

    # S3 storage info
    s3_key = Column(String(500), nullable=False)
    s3_url = Column(String(1000))
    original_filename = Column(String(500))
    content_type = Column(String(100))
    file_size = Column(Integer)  # Size in bytes

    # Timing information
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    processing_time = Column(Float)  # Time in seconds

    # Worker information
    worker_id = Column(String(200))  # Celery task ID

    # Results and errors
    result_data = Column(Text)  # JSON string of results
    error_message = Column(Text)

    # Client callback (optional)
    callback_url = Column(String(1000))

    # Indexes for common queries
    __table_args__ = (
        Index('idx_created_status', 'created_at', 'status'),
        Index('idx_status_created', 'status', 'created_at'),
    )

    def to_dict(self):
        """Convert job to dictionary."""
        return {
            "id": str(self.id),
            "status": self.status.value if self.status else None,
            "model_name": self.model_name,
            "original_filename": self.original_filename,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time": self.processing_time,
            "error_message": self.error_message
        }
