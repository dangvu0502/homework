import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database.core import Base, engine

# Import routers
from src.base_router import base_router 
from src.queue.router import router as queue_router
from src.ws.pubsub import subscriber
from src.ws.router import router as ws_router
from src.ws.websocket import manager
from src.constants import API_VERSION, API_PREFIX

logger = logging.getLogger(__name__)

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
    logger.info("=" * 50)
    logger.info("UI Element Detection API Starting Up")
    logger.info("=" * 50)
    logger.info(f"API Version: {app.version}")
    logger.info("Database: Connected to PostgreSQL")

    # Initialize S3 storage
    try:
        logger.info("S3 Storage: Initialized successfully")
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
    version=API_VERSION,
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

# Include routers
app.include_router(base_router, prefix=API_PREFIX)
app.include_router(queue_router, prefix=API_PREFIX)
app.include_router(ws_router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
