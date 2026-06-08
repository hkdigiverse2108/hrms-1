from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import datetime
import pytz
from bson import ObjectId

# Get the absolute path to the project root (one level up from 'backend' folder)
BASE_DIR = Path(__file__).resolve().parent.parent

import platform

# Load environment variables from root directory
env_files = [".env.server", ".env"]
if platform.system() == "Darwin":
    env_files = [".env", ".env.server"]

for env_file in env_files:
    env_path = BASE_DIR / env_file
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
        break

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set. Please check your .env or .env.server file.")

MONGO_DB = os.getenv("MONGO_DB", "hrms_db")

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

def is_valid_object_id(val):
    if isinstance(val, str) and len(val) == 24:
        try:
            ObjectId(val)
            return True
        except Exception:
            return False
    return False

def string_ids_to_object_ids(data, key_context=None):
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k.startswith("$"):
                current_context = key_context
            else:
                k_lower = k.lower()
                is_id_key = (
                    k_lower.endswith("id") or 
                    k_lower.endswith("_id") or 
                    k_lower in {"members", "savedby", "seenby", "archivedby", "completedby", "votes", "attendance_ids"}
                )
                current_context = k if is_id_key else None
            
            new_dict[k] = string_ids_to_object_ids(v, key_context=current_context)
        return new_dict
    elif isinstance(data, list):
        return [string_ids_to_object_ids(item, key_context) for item in data]
    else:
        if key_context:
            k_lower = key_context.lower()
            is_id_context = (
                k_lower.endswith("id") or 
                k_lower.endswith("_id") or 
                k_lower in {"members", "savedby", "seenby", "archivedby", "completedby", "votes", "attendance_ids"}
            )
            if is_id_context and is_valid_object_id(data):
                return ObjectId(data)
        return data

def object_ids_to_strings(data):
    if isinstance(data, dict):
        return {k: object_ids_to_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [object_ids_to_strings(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

class WrappedCursor:
    def __init__(self, cursor):
        self._cursor = cursor

    def __getattr__(self, name):
        attr = getattr(self._cursor, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                if result is self._cursor:
                    return self
                if hasattr(result, "to_list") and not isinstance(result, WrappedCursor):
                    return WrappedCursor(result)
                return result
            return wrapper
        return attr

    async def to_list(self, *args, **kwargs):
        rows = await self._cursor.to_list(*args, **kwargs)
        return [object_ids_to_strings(row) for row in rows]

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            doc = await self._cursor.__anext__()
            return object_ids_to_strings(doc)
        except StopAsyncIteration:
            raise StopAsyncIteration

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
        document_converted = string_ids_to_object_ids(document)
        return await self._collection.insert_one(document_converted, *args, **kwargs)

    async def insert_many(self, documents, *args, **kwargs):
        now = get_current_time()
        for doc in documents:
            if doc.get('created_at') is None:
                doc['created_at'] = now
            if doc.get('updated_at') is None:
                doc['updated_at'] = now
        documents_converted = [string_ids_to_object_ids(doc) for doc in documents]
        return await self._collection.insert_many(documents_converted, *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
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
            
        filter_converted = string_ids_to_object_ids(filter)
        update_converted = string_ids_to_object_ids(update)
        return await self._collection.update_one(filter_converted, update_converted, *args, **kwargs)

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
            
        filter_converted = string_ids_to_object_ids(filter)
        update_converted = string_ids_to_object_ids(update)
        return await self._collection.update_many(filter_converted, update_converted, *args, **kwargs)

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
            
        filter_converted = string_ids_to_object_ids(filter)
        update_converted = string_ids_to_object_ids(update)
        doc = await self._collection.find_one_and_update(filter_converted, update_converted, *args, **kwargs)
        return object_ids_to_strings(doc)

    def find(self, filter=None, *args, **kwargs):
        filter_converted = string_ids_to_object_ids(filter)
        cursor = self._collection.find(filter_converted, *args, **kwargs)
        return WrappedCursor(cursor)

    async def find_one(self, filter=None, *args, **kwargs):
        filter_converted = string_ids_to_object_ids(filter)
        doc = await self._collection.find_one(filter_converted, *args, **kwargs)
        return object_ids_to_strings(doc)

    async def count_documents(self, filter, *args, **kwargs):
        filter_converted = string_ids_to_object_ids(filter)
        return await self._collection.count_documents(filter_converted, *args, **kwargs)

    async def delete_one(self, filter, *args, **kwargs):
        filter_converted = string_ids_to_object_ids(filter)
        return await self._collection.delete_one(filter_converted, *args, **kwargs)

    async def delete_many(self, filter, *args, **kwargs):
        filter_converted = string_ids_to_object_ids(filter)
        return await self._collection.delete_many(filter_converted, *args, **kwargs)

    def aggregate(self, pipeline, *args, **kwargs):
        pipeline_converted = [string_ids_to_object_ids(stage) for stage in pipeline]
        cursor = self._collection.aggregate(pipeline_converted, *args, **kwargs)
        return WrappedCursor(cursor)

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

print("DEBUG INFO: MONGO_URL =", MONGO_URL)
print("DEBUG INFO: MONGO_DB =", MONGO_DB, type(MONGO_DB))
# Wrap database with dynamic timestamp proxy
db = TimestampedDatabase(client[MONGO_DB])

async def get_db():
    yield db

