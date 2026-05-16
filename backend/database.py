from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables from root directory
root_dir = os.path.join(os.path.dirname(__file__), "..")
for env_file in [".env.server", ".env"]:
    env_path = os.path.join(root_dir, env_file)
    if os.path.exists(env_path):
        load_dotenv(env_path)
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
