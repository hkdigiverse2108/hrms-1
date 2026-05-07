import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if janvii:
        payroll = await db.payroll.find_one({
            "employeeId": str(janvii["_id"]),
            "month": "May",
            "year": 2026
        })
        if payroll:
            remarks = payroll.get('deductionRemarks', '').replace('\u20b9', 'INR')
            print(f"Remarks: {remarks}")

if __name__ == "__main__":
    asyncio.run(check())
