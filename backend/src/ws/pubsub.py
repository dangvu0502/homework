"""Redis pub/sub for WebSocket updates from Celery workers."""
import asyncio
import json
import logging

import redis

from src.settings import config
from src.constants import WS_CHANNEL

logger = logging.getLogger(__name__)


class RedisPublisher:
    """Publishes messages to Redis for WebSocket updates."""

    def __init__(self):
        self.redis_client = redis.from_url(config.redis_url)
        self.channel = WS_CHANNEL

    def publish_job_update(self, job_id: str, data: dict):
        """Publish a job update to Redis."""
        message = {
            "job_id": job_id,
            "data": data
        }
        try:
            result = self.redis_client.publish(self.channel, json.dumps(message))
            logger.info(f"Published update for job {job_id} to {result} subscribers")
            logger.debug(f"Published message: {message}")
        except Exception as e:
            logger.error(f"Failed to publish job update: {e}", exc_info=True)


class RedisSubscriber:
    """Subscribes to Redis for WebSocket updates."""

    def __init__(self):
        self.redis_client = redis.from_url(config.redis_url)
        self.pubsub = self.redis_client.pubsub()
        self.channel = WS_CHANNEL
        self._running = False

    async def start(self, websocket_manager):
        """Start listening for Redis messages."""
        self._running = True
        self.pubsub.subscribe(self.channel)

        logger.info(f"Started Redis subscriber for WebSocket updates on channel: {self.channel}")

        while self._running:
            try:
                # Check for messages with timeout
                message = self.pubsub.get_message(timeout=1.0)

                if message:
                    logger.debug(f"Redis message received: {message}")

                    if message['type'] == 'message':
                        data = json.loads(message['data'])
                        job_id = data['job_id']
                        update_data = data['data']

                        logger.info(f"Processing job update for {job_id}: {update_data.get('status')}")

                        # Send to WebSocket clients
                        await websocket_manager.send_job_update(job_id, update_data)

                # Small delay to prevent busy loop
                await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error in Redis subscriber: {e}", exc_info=True)
                await asyncio.sleep(1)

    def stop(self):
        """Stop the subscriber."""
        self._running = False
        self.pubsub.unsubscribe()
        self.pubsub.close()


# Global instances
publisher = RedisPublisher()
subscriber = RedisSubscriber()
