import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    p = await db.penalty_types.find().to_list(100)
    print("Penalty Types:", p)
    
    # Check Janvii's salary structure
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if janvii:
        salary = await db.salary_structures.find_one({"employeeId": str(janvii["_id"])})
        print("Janvii Salary:", salary)
    
    # Check Remarks for Janvii
    if janvii:
        remarks = await db.remarks.find({"employeeId": str(janvii["_id"])}).to_list(100)
        print("Janvii Remarks:", remarks)

if __name__ == "__main__":
    asyncio.run(check())
