import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    holidays = await db.holidays.find({"date": {"$regex": "^2026-04"}}).to_list(100)
    print("April Holidays:", holidays)

if __name__ == "__main__":
    asyncio.run(check())
