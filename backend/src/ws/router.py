from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.ws.websocket import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time job updates."""
    await manager.connect(websocket)

    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()

            if data.get("type") == "subscribe":
                job_ids = data.get("job_ids", [])
                for job_id in job_ids:
                    manager.subscribe_to_job(websocket, job_id)

                # Send acknowledgment
                await websocket.send_json({
                    "type": "subscribed",
                    "job_ids": job_ids
                })

            elif data.get("type") == "unsubscribe":
                job_ids = data.get("job_ids", [])
                for job_id in job_ids:
                    manager.unsubscribe_from_job(websocket, job_id)

                await websocket.send_json({
                    "type": "unsubscribed",
                    "job_ids": job_ids
                })

            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
