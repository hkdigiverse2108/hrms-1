from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set")

client = AsyncIOMotorClient(MONGO_URL)
db = client.hrms_db

async def get_db():
    yield db
