from fastapi import WebSocket
from typing import Dict, List
import logging

logger = logging.getLogger("websocket")

class ConnectionManager:
    def __init__(self):
        # Maps user_id (string) to their list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    def has_electron_connection(self, user_id: str) -> bool:
        websockets = self.active_connections.get(user_id, [])
        for ws in websockets:
            if getattr(ws, "client_type", "browser") == "electron":
                return True
        return False

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        
        # Detect client type from User-Agent header
        user_agent = websocket.headers.get("user-agent", "").lower()
        websocket.client_type = "electron" if "electron" in user_agent else "browser"
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            is_new = True
        else:
            is_new = False
        
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected via WebSocket ({websocket.client_type}, connections: {len(self.active_connections[user_id])})")
        if is_new:
            await self.broadcast_all("user_status", {"userId": user_id, "isOnline": True})

    async def disconnect(self, user_id: str, websocket: WebSocket = None):
        if user_id in self.active_connections:
            if websocket:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
            else:
                self.active_connections[user_id] = []
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} fully disconnected from WebSocket")
                await self.broadcast_all("user_status", {"userId": user_id, "isOnline": False})
            else:
                logger.info(f"User {user_id} disconnected a connection (remaining: {len(self.active_connections[user_id])})")

    async def send_personal_message(self, user_id: str, event_type: str, data: dict):
        """Sends a JSON event directly to all active WebSocket connections of a specific user."""
        websockets = self.active_connections.get(user_id, [])
        has_electron = self.has_electron_connection(user_id)
        
        dead_sockets = []
        for websocket in list(websockets):
            payload_data = data.copy() if isinstance(data, dict) else data
            if isinstance(payload_data, dict):
                payload_data["hasElectronActive"] = has_electron
            try:
                await websocket.send_json({
                    "event": event_type,
                    "data": payload_data
                })
            except Exception as e:
                logger.warning(f"Error sending message to user {user_id}: {e}")
                dead_sockets.append(websocket)
        
        if dead_sockets:
            for ws in dead_sockets:
                if ws in websockets:
                    websockets.remove(ws)
            if not websockets and user_id in self.active_connections:
                del self.active_connections[user_id]
                await self.broadcast_all("user_status", {"userId": user_id, "isOnline": False})

    async def broadcast_to_group(self, member_ids: List[str], event_type: str, data: dict):
        """Broadcasts a JSON event to a list of group members who are currently online."""
        for member_id in member_ids:
            await self.send_personal_message(member_id, event_type, data)

    async def broadcast_all(self, event_type: str, data: dict):
        """Broadcasts a JSON event to all currently online users."""
        users_to_cleanup = []
        for user_id, websockets in list(self.active_connections.items()):
            has_electron = self.has_electron_connection(user_id)
            dead_sockets = []
            for websocket in list(websockets):
                payload_data = data.copy() if isinstance(data, dict) else data
                if isinstance(payload_data, dict):
                    payload_data["hasElectronActive"] = has_electron
                try:
                    await websocket.send_json({
                        "event": event_type,
                        "data": payload_data
                    })
                except Exception as e:
                    logger.warning(f"Error sending message to user {user_id} during broadcast: {e}")
                    dead_sockets.append(websocket)
            
            if dead_sockets:
                for ws in dead_sockets:
                    if ws in websockets:
                        websockets.remove(ws)
                if not websockets:
                    users_to_cleanup.append(user_id)
        
        for user_id in users_to_cleanup:
            if user_id in self.active_connections:
                del self.active_connections[user_id]
                await self.broadcast_all("user_status", {"userId": user_id, "isOnline": False})

manager = ConnectionManager()
