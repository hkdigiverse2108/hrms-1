from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
from dotenv import load_dotenv

# Get the absolute path to the project root (one level up from 'backend' folder)
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from root directory
for env_file in [".env.server", ".env"]:
    env_path = BASE_DIR / env_file
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
        break

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set. Please check your .env or .env.server file.")

ALLOW_INVALID_CERTS = os.getenv("ALLOW_INVALID_CERTS", "true").lower() == "true"

client = AsyncIOMotorClient(
    MONGO_URL, 
    tls=True,
    tlsAllowInvalidCertificates=ALLOW_INVALID_CERTS
)
db = client.hrms_db

async def get_db():
    yield db
