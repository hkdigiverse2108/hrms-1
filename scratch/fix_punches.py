import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def fix_data():
    mongo_url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client.hrms_db
    
    print("Fixing attendance records with missing punchIn in punches list...")
    # Find records where any element in punches list is missing punchIn
    cursor = db.attendance.find({"punches": {"$elemMatch": {"punchIn": {"$exists": False}}}})
    count = 0
    async for doc in cursor:
        punches = doc.get("punches", [])
        modified = False
        for p in punches:
            if "punchIn" not in p:
                p["punchIn"] = doc.get("checkIn", "09:00:00") # Fallback to checkIn or 9AM
                modified = True
        
        if modified:
            await db.attendance.update_one(
                {"_id": doc["_id"]},
                {"$set": {"punches": punches}}
            )
            print(f"Fixed punchIn for document {doc['_id']}")
            count += 1
            
    print(f"Done. Fixed {count} records.")

if __name__ == "__main__":
    asyncio.run(fix_data())
