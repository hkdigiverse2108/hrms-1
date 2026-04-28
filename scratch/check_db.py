import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    mongo_url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(mongo_url)
    db = client.hrms_db
    
    employee = await db.employees.find_one({"employeeId": "EMP002"})
    if employee:
        print("FOUND EMPLOYEE:")
        for k, v in employee.items():
            print(f"{k}: {v}")
    else:
        print("EMPLOYEE NOT FOUND")
        # List all employee IDs
        print("LISTING ALL EMPLOYEES:")
        async for emp in db.employees.find():
            print(f"ID: {emp.get('employeeId')} - NAME: {emp.get('name')}")

if __name__ == "__main__":
    asyncio.run(main())
