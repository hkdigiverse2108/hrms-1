import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGODB_URL = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
client = AsyncIOMotorClient(MONGODB_URL)
db = client.hrms_db

PENALTIES = [
    {"name": "Language rule violation", "amount": 10},
    {"name": "Clean desk violation", "amount": 20},
    {"name": "No socks", "amount": 10},
    {"name": "Non-dry snacks", "amount": 50},
    {"name": "Phone not submitted / unauthorized use", "amount": 500},
    {"name": "Phone not on silent", "amount": 50},
    {"name": "Activity not participated", "amount": 20},
    {"name": "Disrespectful behavior", "amount": 10},
]

async def seed_penalties():
    # Clear existing penalty types
    await db.penalty_types.delete_many({})
    # Insert new ones
    result = await db.penalty_types.insert_many(PENALTIES)
    print(f"Successfully seeded {len(result.inserted_ids)} penalty types.")

if __name__ == "__main__":
    asyncio.run(seed_penalties())
