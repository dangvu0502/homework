"""WebSocket connection manager for real-time updates."""
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time job updates."""

    def __init__(self):
        # Store active connections by job_id
        self.active_connections: dict[str, set[WebSocket]] = {}
        # Store connection to job mappings
        self.connection_jobs: dict[WebSocket, set[str]] = {}

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.connection_jobs[websocket] = set()
        logger.info("WebSocket connection established")

    def subscribe_to_job(self, websocket: WebSocket, job_id: str):
        """Subscribe a connection to job updates."""
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()

        self.active_connections[job_id].add(websocket)
        self.connection_jobs[websocket].add(job_id)
        logger.info(f"WebSocket subscribed to job {job_id}")

    def unsubscribe_from_job(self, websocket: WebSocket, job_id: str):
        """Unsubscribe a connection from job updates."""
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

        if websocket in self.connection_jobs:
            self.connection_jobs[websocket].discard(job_id)

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        # Remove from all job subscriptions
        if websocket in self.connection_jobs:
            for job_id in self.connection_jobs[websocket]:
                if job_id in self.active_connections:
                    self.active_connections[job_id].discard(websocket)
                    if not self.active_connections[job_id]:
                        del self.active_connections[job_id]

            del self.connection_jobs[websocket]

        logger.info("WebSocket connection closed")

    async def send_job_update(self, job_id: str, data: dict):
        """Send an update to all connections subscribed to a job."""
        if job_id in self.active_connections:
            dead_connections = set()

            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json({
                        "type": "job_update",
                        "job_id": job_id,
                        "data": data
                    })
                except Exception as e:
                    logger.error(f"Error sending to WebSocket: {e}")
                    dead_connections.add(connection)

            # Clean up dead connections
            for connection in dead_connections:
                self.disconnect(connection)

    async def broadcast_to_job(self, job_id: str, message: dict):
        """Broadcast a message to all connections subscribed to a job."""
        await self.send_job_update(job_id, message)


# Global connection manager instance
manager = ConnectionManager()
