import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if janvii:
        remarks = await db.remarks.find({"employeeId": str(janvii["_id"]), "type": {"$regex": "Late"}}).to_list(100)
        for r in remarks:
            print(f"Type: '{r.get('type')}', Date: '{r.get('date')}'")

if __name__ == "__main__":
    asyncio.run(check())
