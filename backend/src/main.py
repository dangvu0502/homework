import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.api import api_router
from src.db.database import engine, Base
from src.celery.models import Job  # Import to register the model
from src.websocket_manager import manager
from src.redis_pubsub import subscriber

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    # Startup
    logger = logging.getLogger(__name__)
    logger.info("=" * 50)
    logger.info("UI Element Detection API Starting Up")
    logger.info("=" * 50)
    logger.info(f"API Version: {app.version}")
    logger.info(f"Database: Connected to PostgreSQL")
    
    # Initialize S3 storage
    try:
        from src.storage import storage
        logger.info(f"S3 Storage: Initialized successfully")
    except Exception as e:
        logger.error(f"S3 Storage: Failed to initialize - {str(e)}")
    
    # Start Redis subscriber for WebSocket updates
    redis_task = asyncio.create_task(subscriber.start(manager))
    logger.info("WebSocket: Started Redis subscriber")
    logger.info("=" * 50)
    
    yield
    
    # Shutdown
    subscriber.stop()
    redis_task.cancel()
    try:
        await redis_task
    except asyncio.CancelledError:
        pass
    logger.info("Stopped Redis subscriber")


app = FastAPI(
    title="UI Element Detection API",
    version="0.2.0",
    description="Scalable API for UI element detection with asynchronous processing",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
