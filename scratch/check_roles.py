import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    mongo_url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(mongo_url)
    db = client.hrms_db
    
    for coll in ["roles", "positions"]:
        print(f"\n{coll.upper()}:")
        async for doc in db[coll].find():
            print(doc)

if __name__ == "__main__":
    asyncio.run(main())
