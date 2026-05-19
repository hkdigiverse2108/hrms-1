from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import datetime
import pytz

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

# --- Automatic Timestamp Handling Wrapper classes ---
IST = pytz.timezone('Asia/Kolkata')

def get_current_time():
    return datetime.now(IST)

class TimestampedCollection:
    def __init__(self, collection: AsyncIOMotorCollection):
        self._collection = collection

    def __getattr__(self, name):
        return getattr(self._collection, name)

    async def insert_one(self, document, *args, **kwargs):
        now = get_current_time()
        if document.get('created_at') is None:
            document['created_at'] = now
        if document.get('updated_at') is None:
            document['updated_at'] = now
        return await self._collection.insert_one(document, *args, **kwargs)

    async def insert_many(self, documents, *args, **kwargs):
        now = get_current_time()
        for doc in documents:
            if doc.get('created_at') is None:
                doc['created_at'] = now
            if doc.get('updated_at') is None:
                doc['updated_at'] = now
        return await self._collection.insert_many(documents, *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
        now = get_current_time()
        if isinstance(update, dict):
            if '$set' in update:
                # Remove client-sent timestamps to prevent null or client overrides
                update['$set'].pop('created_at', None)
                update['$set'].pop('updated_at', None)
            else:
                update['$set'] = {}
            update['$set']['updated_at'] = now
            
            if '$setOnInsert' in update:
                update['$setOnInsert'].pop('created_at', None)
            else:
                update['$setOnInsert'] = {}
            update['$setOnInsert']['created_at'] = now
        elif isinstance(update, list):
            update.append({"$set": {"updated_at": now}})
        return await self._collection.update_one(filter, update, *args, **kwargs)

    async def update_many(self, filter, update, *args, **kwargs):
        now = get_current_time()
        if isinstance(update, dict):
            if '$set' in update:
                update['$set'].pop('created_at', None)
                update['$set'].pop('updated_at', None)
            else:
                update['$set'] = {}
            update['$set']['updated_at'] = now
            
            if '$setOnInsert' in update:
                update['$setOnInsert'].pop('created_at', None)
            else:
                update['$setOnInsert'] = {}
            update['$setOnInsert']['created_at'] = now
        elif isinstance(update, list):
            update.append({"$set": {"updated_at": now}})
        return await self._collection.update_many(filter, update, *args, **kwargs)

    async def find_one_and_update(self, filter, update, *args, **kwargs):
        now = get_current_time()
        if isinstance(update, dict):
            if '$set' in update:
                update['$set'].pop('created_at', None)
                update['$set'].pop('updated_at', None)
            else:
                update['$set'] = {}
            update['$set']['updated_at'] = now
            
            if '$setOnInsert' in update:
                update['$setOnInsert'].pop('created_at', None)
            else:
                update['$setOnInsert'] = {}
            update['$setOnInsert']['created_at'] = now
        elif isinstance(update, list):
            update.append({"$set": {"updated_at": now}})
        return await self._collection.find_one_and_update(filter, update, *args, **kwargs)

class TimestampedDatabase:
    def __init__(self, db):
        self._db = db

    def __getattr__(self, name):
        attr = getattr(self._db, name)
        if isinstance(attr, AsyncIOMotorCollection):
            return TimestampedCollection(attr)
        return attr

    def __getitem__(self, name):
        item = self._db[name]
        if isinstance(item, AsyncIOMotorCollection):
            return TimestampedCollection(item)
        return item

# Wrap database with dynamic timestamp proxy
db = TimestampedDatabase(client.hrms_db)

async def get_db():
    yield db

