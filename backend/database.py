from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set")

import ssl

client = AsyncIOMotorClient(
    MONGO_URL, 
    tls=True,
    tlsAllowInvalidCertificates=True
)
db = client.hrms_db

async def get_db():
    yield db
