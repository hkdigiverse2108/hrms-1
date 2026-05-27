from fastapi import WebSocket
from typing import Dict, List
import logging

logger = logging.getLogger("websocket")

class ConnectionManager:
    def __init__(self):
        # Maps user_id (string) to their active WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, user_id: str, event_type: str, data: dict):
        """Sends a JSON event directly to a specific user if they are currently online."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json({
                    "event": event_type,
                    "data": data
                })
            except Exception as e:
                logger.warning(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast_to_group(self, member_ids: List[str], event_type: str, data: dict):
        """Broadcasts a JSON event to a list of group members who are currently online."""
        for member_id in member_ids:
            await self.send_personal_message(member_id, event_type, data)

manager = ConnectionManager()
