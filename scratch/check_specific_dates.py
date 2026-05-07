import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if janvii:
        emp_id = str(janvii["_id"])
        dates = ["2026-04-02", "2026-04-03", "2026-04-13", "2026-04-25"]
        for d in dates:
            att = await db.attendance.find_one({"employeeId": emp_id, "date": d})
            print(f"Date: {d}, Attendance: {att is not None}")
            if att:
                print(f"  CheckIn: {att.get('checkIn')}")

if __name__ == "__main__":
    asyncio.run(check())
