import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def test_conn():
    load_dotenv(".env")
    mongo_url = os.getenv("MONGO_URL")
    print(f"URL: {mongo_url[:20]}...")
    client = AsyncIOMotorClient(mongo_url)
    try:
        await client.admin.command('ping')
        print("Connected successfully!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
