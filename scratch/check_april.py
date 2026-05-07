import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if janvii:
        # Check leaves in April
        leaves = await db.leave_requests.find({
            "employeeId": str(janvii["_id"]),
            "status": "Approved",
            "startDate": {"$regex": "^2026-04"}
        }).to_list(100)
        print("Janvii April Leaves:", leaves)
        
        # Check Attendance in April
        attendance = await db.attendance.count_documents({
            "employeeId": str(janvii["_id"]),
            "date": {"$regex": "^2026-04"}
        })
        print("Janvii April Attendance Count:", attendance)

if __name__ == "__main__":
    asyncio.run(check())
